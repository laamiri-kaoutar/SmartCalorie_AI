from __future__ import annotations

import json
import re
import time
from contextlib import nullcontext
from typing import List

import google.generativeai as genai
import mlflow
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.config import settings
from core.metrics import AI_RECOMMENDATION_LATENCY, AI_RECOMMENDATION_RETRIES
from models.ingredient import Ingredient
from models.plan import DailyPlan, MealEntry, MealIngredient
from models.user import User
from schemas.plan import (
    FinalMealPlan,
    GeneratePlanInput,
    GeneratePlanResponse,
    MealEntryOut,
    MealIngredientOut,
    MealBlueprint,
    PlanDetails,
    PlanHistory,
    PlanOut,
    SlotPlan,
)
from services.nutrition_service import NutritionService
from services.portion_service import PortionService
from services.repository import Repository


class RecommendationService:

    def __init__(self) -> None:
        print(f" RecommendationService - Initializing Gemini with model {settings.GEMINI_MODEL}")
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.model_name = settings.GEMINI_MODEL
        self.model = genai.GenerativeModel(self.model_name)
        try:
            mlflow.set_tracking_uri("http://mlflow:5000")
            mlflow.set_experiment("SmartCalorie_AI_Recommendations")
        except Exception as e:
            print(f"WARNING: RecommendationService - MLflow tracking unavailable. Error: {e}")

    def calculate_tdee(self, user: User) -> float:
        
        return NutritionService.calculate_tdee(user)

    def get_weighted_targets(
        self,
        user: User,
        predicted_burn: float,
        meals_per_day: int,
        snacks_per_day: int,
        meal_weight: float = 1.0,
        snack_weight: float = 0.5,
    ) -> tuple[float, List[float]]:
       
        tdee = self.calculate_tdee(user)
        total = tdee + float(predicted_burn)
        targets = NutritionService.split_calories_to_slots(
            total_calories=total,
            meals_count=meals_per_day,
            snacks_count=snacks_per_day,
            meal_weight=meal_weight,
            snack_weight=snack_weight,
        )
        if not targets:
            raise HTTPException(status_code=400, detail="Cannot split calories with zero meals and snacks.")
        return total, targets

    def build_system_prompt(self, allergies: List[str]) -> str:
        allergy_text = ", ".join(allergies) if allergies else "none"
        return (
            "You are a professional chef and registered dietitian. "
            "Your job is to design practical, balanced meals using common, globally available ingredients. "
            f"Strictly avoid these allergies: {allergy_text}. "
            "Respond with **only** valid JSON that matches this schema:\n"
            "{\n"
            '  "meal_name": string,\n'
            '  "ingredients": [\n'
            "    {\n"
            '      "name": string,\n'
            '      "role": "vegetable" | "protein" | "carb" | "fat",\n'
            '      "min_g": number | null,\n'
            '      "max_g": number | null,\n'
            '      "suggested_g": number | null\n'
            "    }\n"
            "  ],\n"
            '  "preparation_steps": [string]\n'
            "}\n"
            "Do not include comments, explanations, or markdown code fences."
        )

    def extract_json(self, text: str) -> dict:
        if not text:
            raise ValueError("Empty response from Gemini")
        fenced = re.search(r"```(?:json)?(.*?)```", text, re.DOTALL | re.IGNORECASE)
        if fenced:
            text = fenced.group(1)
        text = text.strip()
        return json.loads(text)

    def call_gemini_for_blueprint(
        self,
        target_calories: float,
        preferences_text: str,
        allergies: List[str],
        generated_meals: List[str] | None = None,
        failed_ingredients: List[str] | None = None,
    ) -> MealBlueprint:
        system_prompt = self.build_system_prompt(allergies)

        user_lines = [
            f"Target calories for this meal: {target_calories:.0f}.",
            f"Preferences: {preferences_text}.",
            "Use simple ingredient names that are likely to exist in a USDA-style nutrition database.",
        ]
        if generated_meals:
            user_lines.append(
                "Ensure variety. Do not repeat ingredients or styles from these previously generated meals: "
                f"{generated_meals}."
            )
        if failed_ingredients:
            failed_str = ", ".join(sorted(set(failed_ingredients)))
            user_lines.append(
                f"The following ingredients could not be resolved in our database: {failed_str}. "
                "Regenerate the meal using simpler, more common alternatives."
            )

        response = self.model.generate_content([system_prompt, "\n".join(user_lines)])
        text = ""
        try:
            text = response.text  
        except Exception:
            try:
                if response.candidates:
                    candidate = response.candidates[0]
                    if candidate.content and candidate.content.parts:
                        text = "".join(p.text or "" for p in candidate.content.parts)
            except Exception as exc:  
                raise HTTPException(status_code=502, detail=f"Gemini response error: {exc}") from exc

        try:
            data = self.extract_json(text)
            return MealBlueprint.model_validate(data)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failed to parse Gemini blueprint: {exc}") from exc

    def preferences_to_text(self, body: GeneratePlanInput) -> str:
        prefs = body.preferences
        parts: List[str] = []
        if prefs.vegan:
            parts.append("vegan")
        elif prefs.vegetarian:
            parts.append("vegetarian")
        if prefs.cuisine:
            parts.append(f"cuisine: {prefs.cuisine}")
        if prefs.disliked_ingredients:
            parts.append("avoid: " + ", ".join(prefs.disliked_ingredients))
        if not parts:
            parts.append("no strong dietary preferences")
        return "; ".join(parts)

    def generate_daily_plan(
        self,
        db: Session,
        user: User,
        body: GeneratePlanInput,
    ) -> GeneratePlanResponse:
        start_time = time.time()
        total_retries = 0
        mlflow_ctx = nullcontext()
        mlflow_enabled = False
        try:
            mlflow_ctx = mlflow.start_run(run_name="Meal_Plan_Generation")
            mlflow_enabled = True
        except Exception as e:
            print(f"WARNING: RecommendationService - MLflow tracking unavailable. Error: {e}")
            mlflow_enabled = False

        if body.meals_per_day <= 0 and body.snacks_per_day <= 0:
            raise HTTPException(status_code=400, detail="At least one meal or snack is required.")

        with mlflow_ctx:
            if mlflow_enabled:
                try:
                    calculated_tdee = float(self.calculate_tdee(user))
                    cuisine = (body.preferences.cuisine or "").strip() if body.preferences else ""

                    mlflow.log_param("age", user.age)
                    mlflow.log_param("gender", user.gender)
                    mlflow.log_param("weight", user.weight)
                    mlflow.log_param("height", user.height)

                    mlflow.log_param("meals_per_day", int(body.meals_per_day))
                    mlflow.log_param("snacks_per_day", int(body.snacks_per_day))
                    mlflow.log_param("cuisine", cuisine or "unknown")

                    mlflow.log_param("calculated_tdee", calculated_tdee)
                    mlflow.log_param("predicted_burn", float(body.predicted_burn))

                    mlflow.log_param("model_name", self.model_name)
                    mlflow.set_tag("cuisine", cuisine or "unknown")
                except Exception as e:
                    print(f"WARNING: RecommendationService - MLflow logging skipped. Error: {e}")

            total_target, slot_targets = self.get_weighted_targets(
                user=user,
                predicted_burn=body.predicted_burn,
                meals_per_day=body.meals_per_day,
                snacks_per_day=body.snacks_per_day,
            )

            if mlflow_enabled:
                try:
                    mlflow.log_param("total_target", float(total_target))
                except Exception as e:
                    print(f"DEBUG: MLflow Rec Tracking Error: {e}")

            preferences_text = self.preferences_to_text(body)
            allergies = body.preferences.allergies or []

            portion_service = PortionService(db)
            slots: List[SlotPlan] = []
            generated_meals: List[str] = []

            def slot_name(index: int) -> str:
                if index < body.meals_per_day:
                    labels = ["Breakfast", "Lunch", "Dinner"]
                    return labels[index] if index < len(labels) else f"Meal {index + 1}"
                snack_idx = index - body.meals_per_day + 1
                return f"Snack {snack_idx}"

            for i, target_calories in enumerate(slot_targets):
                failed: List[str] = []
                blueprint: MealBlueprint | None = None
                attempts = 0

                # Retry loop for unresolvable ingredients
                for _ in range(3):
                    attempts += 1
                    blueprint = self.call_gemini_for_blueprint(
                        target_calories=target_calories,
                        preferences_text=preferences_text,
                        allergies=allergies,
                        generated_meals=generated_meals,
                        failed_ingredients=failed or None,
                    )

                    # Check which ingredients resolve
                    failed = []
                    for bi in blueprint.ingredients:
                        ing = portion_service.resolve_ingredient(bi.name)
                        if not ing:
                            failed.append(bi.name)
                    if not failed:
                        break

                total_retries += max(0, attempts - 1)

                if not blueprint or failed:
                    raise HTTPException(
                        status_code=502,
                        detail=(
                            f"Unable to generate resolvable meal blueprint after 3 attempts "
                            f"for slot {slot_name(i)}. Last missing ingredients: {failed}"
                        ),
                    )

                final_meal: FinalMealPlan = portion_service.calculate_portions(
                    blueprint=blueprint,
                    target_calories=target_calories,
                )
                generated_meals.append(final_meal.meal_name)

                slots.append(
                    SlotPlan(
                        slot_name=slot_name(i),
                        target_calories=target_calories,
                        meal=final_meal,
                    )
                )

            response = GeneratePlanResponse(
                total_target_calories=total_target,
                slots=slots,
            )
            final_response = response

            try:
                Repository().save_daily_plan(
                    db=db,
                    user_id=int(user.id),
                    plan_response=response,
                )
            except Exception:
                pass

            if mlflow_enabled:
                try:
                    total_latency = float(time.time() - start_time)
                    mlflow.log_metric("total_latency", total_latency)
                    mlflow.log_metric("total_retries", float(total_retries))
                    mlflow.log_metric("final_calculated_total_calories", float(response.total_target_calories))
                    mlflow.log_dict(final_response.model_dump(), "meal_plan.json")
                except Exception as e:
                    print(f"WARNING: RecommendationService - MLflow logging skipped. Error: {e}")

            try:
                AI_RECOMMENDATION_LATENCY.observe(float(time.time() - start_time))
                AI_RECOMMENDATION_RETRIES.inc(float(total_retries))
            except Exception:
                pass

            return response

    def get_plan_history(self, db: Session, user_id: int) -> PlanHistory:
        plans = Repository().get_user_plans(db, int(user_id))
        out = [PlanOut(id=p.id, date=p.date, total_target_calories=p.total_target_calories) for p in plans]
        return PlanHistory(plans=out)

    def get_plan_details(self, db: Session, user_id: int, plan_id: int) -> PlanDetails:
        data = Repository().get_plan_details(db, int(plan_id), int(user_id))
        if not data:
            raise HTTPException(status_code=404, detail="Plan not found")

        plan: DailyPlan = data["plan"]
        entries: list[MealEntry] = data["entries"]
        meal_ings: list[MealIngredient] = data["meal_ingredients"]
        ing_by_id: dict[int, Ingredient] = data["ingredients_by_id"]

        meal_ings_by_entry: dict[int, list[MealIngredient]] = {}
        for mi in meal_ings:
            meal_ings_by_entry.setdefault(mi.meal_entry_id, []).append(mi)

        meals_out: list[MealEntryOut] = []
        for e in entries:
            steps: list[str] = []
            if e.preparation_steps:
                try:
                    steps = json.loads(e.preparation_steps)
                except Exception:
                    steps = []

            ing_out: list[MealIngredientOut] = []
            for mi in meal_ings_by_entry.get(e.id, []):
                ing = ing_by_id.get(int(mi.ingredient_id))
                ing_out.append(
                    MealIngredientOut(
                        ingredient_id=int(mi.ingredient_id),
                        ingredient_name=ing.name if ing else str(mi.ingredient_id),
                        grams=float(mi.grams),
                        unit_quantity=float(mi.unit_quantity),
                        unit_name=str(mi.unit_name),
                    )
                )

            meals_out.append(
                MealEntryOut(
                    id=e.id,
                    name=e.name,
                    entry_type=str(e.entry_type.value) if hasattr(e.entry_type, "value") else str(e.entry_type),
                    target_calories=float(e.target_calories),
                    preparation_steps=steps,
                    ingredients=ing_out,
                )
            )

        return PlanDetails(
            plan=PlanOut(id=plan.id, date=plan.date, total_target_calories=plan.total_target_calories),
            meals=meals_out,
        )

