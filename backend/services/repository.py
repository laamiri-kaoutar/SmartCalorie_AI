from __future__ import annotations

import json
from datetime import date
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.ingredient import Ingredient
from models.plan import DailyPlan, MealEntry, MealEntryType, MealIngredient
from models.user import User
from models.workout import Workout, WorkoutExercise
from schemas.plan import GeneratePlanResponse
from schemas.workout import WorkoutInput


class Repository:
    def save_workout(
        self,
        db: Session,
        user_id: int,
        workout_input: WorkoutInput,
        total_calories: float,
    ) -> Workout:
        workout = Workout(
            user_id=user_id,
            avg_heart_rate=float(workout_input.avg_heart_rate) if workout_input.avg_heart_rate is not None else None,
            total_calories=float(total_calories),
        )
        db.add(workout)
        db.flush()

        for ex in workout_input.exercises:
            db.add(
                WorkoutExercise(
                    workout_id=workout.id,
                    exercise_type=str(ex.exercise_type),
                    duration_minutes=float(ex.duration_minutes),
                    intensity_level=str(ex.intensity_level),
                )
            )

        db.commit()
        db.refresh(workout)
        return workout

    def find_ingredient_id(self, db: Session, ingredient_name: str) -> Optional[int]:
        if not ingredient_name:
            return None
        ing = db.query(Ingredient).filter(Ingredient.name == ingredient_name).first()
        if ing:
            return int(ing.id)
        ing = db.query(Ingredient).filter(Ingredient.name.ilike(ingredient_name)).first()
        if ing:
            return int(ing.id)
        ing = db.query(Ingredient).filter(Ingredient.simplified_name.ilike(ingredient_name)).first()
        if ing:
            return int(ing.id)
        return None

    def save_daily_plan(
        self,
        db: Session,
        user_id: int,
        plan_response: GeneratePlanResponse,
    ) -> DailyPlan:
        plan = DailyPlan(
            user_id=user_id,
            date=date.today(),
            total_target_calories=float(plan_response.total_target_calories),
        )
        db.add(plan)
        db.flush()

        for slot in plan_response.slots:
            slot_name = (slot.slot_name or "").lower()
            entry_type = MealEntryType.SNACK if slot_name.startswith("snack") else MealEntryType.MEAL
            steps_text = json.dumps(slot.meal.preparation_steps or [], ensure_ascii=False)

            entry = MealEntry(
                plan_id=plan.id,
                name=slot.meal.meal_name,
                entry_type=entry_type,
                target_calories=float(slot.target_calories),
                preparation_steps=steps_text,
            )
            db.add(entry)
            db.flush()

            for ing in slot.meal.ingredients:
                ingredient_id = self.find_ingredient_id(db, ing.name)
                if ingredient_id is None:
                    continue
                db.add(
                    MealIngredient(
                        meal_entry_id=entry.id,
                        ingredient_id=ingredient_id,
                        grams=float(ing.grams),
                        unit_quantity=float(ing.unit_quantity),
                        unit_name=str(ing.unit),
                    )
                )

        db.commit()
        db.refresh(plan)
        return plan

    def get_user_workouts(self, db: Session, user_id: int) -> list[Workout]:
        return (
            db.query(Workout)
            .filter(Workout.user_id == user_id)
            .order_by(Workout.created_at.desc(), Workout.id.desc())
            .all()
        )

    def get_user_plans(self, db: Session, user_id: int) -> list[DailyPlan]:
        return (
            db.query(DailyPlan)
            .filter(DailyPlan.user_id == user_id)
            .order_by(DailyPlan.date.desc(), DailyPlan.id.desc())
            .all()
        )

    def get_plan_details(self, db: Session, plan_id: int, user_id: int) -> dict[str, Any] | None:
        plan = (
            db.query(DailyPlan)
            .filter(DailyPlan.id == plan_id, DailyPlan.user_id == user_id)
            .first()
        )
        if not plan:
            return None

        entries = (
            db.query(MealEntry)
            .filter(MealEntry.plan_id == plan.id)
            .order_by(MealEntry.id.asc())
            .all()
        )

        entry_ids = [e.id for e in entries]
        if not entry_ids:
            return {"plan": plan, "entries": [], "ingredients": []}

        meal_ings = (
            db.query(MealIngredient)
            .filter(MealIngredient.meal_entry_id.in_(entry_ids))
            .order_by(MealIngredient.meal_entry_id.asc(), MealIngredient.id.asc())
            .all()
        )

        ingredient_ids = list({mi.ingredient_id for mi in meal_ings})
        ingredients = (
            db.query(Ingredient)
            .filter(Ingredient.id.in_(ingredient_ids))
            .all()
            if ingredient_ids
            else []
        )
        ing_by_id = {int(i.id): i for i in ingredients}

        return {
            "plan": plan,
            "entries": entries,
            "meal_ingredients": meal_ings,
            "ingredients_by_id": ing_by_id,
        }

    def update_user_profile(self, db: Session, user_id: int, update_data: dict[str, Any]) -> User | None:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        for field in ["full_name", "age", "gender", "height", "weight"]:
            if field in update_data and update_data[field] is not None:
                setattr(user, field, update_data[field])

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def get_all_users(self, db: Session) -> list[User]:
        return db.query(User).order_by(User.id.asc()).all()

    def delete_user(self, db: Session, user_id: int) -> bool:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        db.delete(user)
        db.commit()
        return True

    def get_system_stats(self, db: Session) -> dict[str, int]:
        total_users = int(db.query(func.count(User.id)).scalar() or 0)
        total_workouts = int(db.query(func.count(Workout.id)).scalar() or 0)
        total_plans = int(db.query(func.count(DailyPlan.id)).scalar() or 0)
        return {
            "total_users": total_users,
            "total_workouts": total_workouts,
            "total_plans": total_plans,
        }

    def search_ingredients(self, db: Session, query: str) -> list[Ingredient]:
        q = (query or "").strip()
        if not q:
            return []
        return (
            db.query(Ingredient)
            .filter(
                (Ingredient.simplified_name.ilike(f"%{q.lower()}%"))
                | (Ingredient.name.ilike(f"%{q}%"))
            )
            .order_by(Ingredient.simplified_name.asc())
            .limit(50)
            .all()
        )

