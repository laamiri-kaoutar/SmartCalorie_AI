from typing import List, Optional, Tuple

import requests
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.ingredient import Ingredient
from schemas.plan import BlueprintIngredient, FinalIngredient, FinalMealPlan, MealBlueprint
from scripts.usda_harvester import (
    _get_usda_api_key,
    extract_nutrients,
    get_food_details,
    search_foods,
    simplify_name,
)


class PortionService:
    """
    Resolve ingredients (DB first, then USDA) and scale portions to hit a calorie target.

    Rules:
    - Vegetables: keep at suggested_g or midpoint of range.
    - Protein: fix at midpoint of range.
    - Remaining calories go to carbs and fats, scaled within their ranges.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def normalize_query(self, name: str) -> str:
        return simplify_name(name or "").lower()

    def resolve_ingredient(self, name: str) -> Optional[Ingredient]:
        """
        Resolve an ingredient name:
        1. Case-insensitive fuzzy match on simplified_name in PostgreSQL.
        2. If not found, query USDA API and persist a new Ingredient.
        """
        if not name:
            return None

        query_name = self.normalize_query(name)
        if not query_name:
            return None

        # Local DB search first
        match = (
            self.db.query(Ingredient)
            .filter(Ingredient.simplified_name.ilike(f"%{query_name}%"))
            .order_by(func.length(Ingredient.simplified_name))
            .first()
        )
        if match:
            return match

        # USDA fallback
        api_key = _get_usda_api_key()
        if not api_key:
            return None

        try:
            foods = search_foods(api_key, query_name, page_size=10)
        except requests.RequestException:
            return None

        if not foods:
            return None

        first = foods[0]
        fdc_id = first.get("fdcId")
        usda_name = first.get("description") or first.get("name") or name
        if not fdc_id or not usda_name:
            return None

        existing = self.db.query(Ingredient).filter(Ingredient.fdc_id == fdc_id).first()
        if existing:
            return existing

        details = get_food_details(api_key, fdc_id)
        if not details:
            return None

        calories, protein, carbs, fat = extract_nutrients(details)
        simplified = simplify_name(usda_name)
        if not simplified:
            simplified = usda_name.lower()[:255]

        ingredient = Ingredient(
            fdc_id=fdc_id,
            name=usda_name[:500],
            simplified_name=simplified[:255],
            category="Unknown",
            calories_per_100g=calories,
            protein_g=protein,
            carbs_g=carbs,
            fat_g=fat,
            typical_unit="grams",
            grams_per_unit=1.0,
        )
        self.db.add(ingredient)
        self.db.commit()
        self.db.refresh(ingredient)
        return ingredient

    def calories_for_grams(self, ingredient: Ingredient, grams: float) -> float:
        return (float(ingredient.calories_per_100g) / 100.0) * grams

    def grams_to_unit(self, grams: float, typical_unit: str, grams_per_unit: float) -> float:
        if grams_per_unit <= 0:
            return grams
        return round(grams / grams_per_unit, 2)

    def calculate_portions(self, blueprint: MealBlueprint, target_calories: float) -> FinalMealPlan:
        resolved: List[Tuple[BlueprintIngredient, Optional[Ingredient], float]] = []

        # Initial gram decisions
        for bi in blueprint.ingredients:
            ingredient = self.resolve_ingredient(bi.name)
            min_g = bi.min_g if bi.min_g is not None else 0.0
            max_g = bi.max_g if bi.max_g is not None else 200.0
            mid_g = (min_g + max_g) / 2.0 if bi.min_g is not None and bi.max_g is not None else max_g

            role = (bi.role or "").lower()
            if role == "vegetable":
                grams = bi.suggested_g if bi.suggested_g is not None else mid_g
            elif role == "protein":
                grams = mid_g
            else:
                grams = mid_g

            resolved.append((bi, ingredient, max(0.0, grams)))

        # Separate indices
        carb_indices = [i for i, (bi, _, _) in enumerate(resolved) if (bi.role or "").lower() == "carb"]
        fat_indices = [i for i, (bi, _, _) in enumerate(resolved) if (bi.role or "").lower() == "fat"]

        # Fixed calories (veg + protein + unresolved)
        fixed_calories = 0.0
        for _, ing, grams in resolved:
            if not ing:
                continue
            fixed_calories += self.calories_for_grams(ing, grams)

        remaining = max(0.0, target_calories - fixed_calories)

        # Scale carbs + fats to fill remaining calories
        cf_indices = carb_indices + fat_indices
        if cf_indices:
            current_cf_cals = sum(
                self.calories_for_grams(resolved[i][1], resolved[i][2])
                for i in cf_indices
                if resolved[i][1] is not None
            )
            if current_cf_cals > 0 and remaining > 0:
                scale = remaining / current_cf_cals
                updated: List[Tuple[BlueprintIngredient, Optional[Ingredient], float]] = list(resolved)
                for idx in cf_indices:
                    bi, ing, grams = updated[idx]
                    if not ing:
                        continue
                    min_g = bi.min_g if bi.min_g is not None else 0.0
                    max_g = bi.max_g if bi.max_g is not None else 200.0
                    new_grams = grams * scale
                    new_grams = max(min_g, min(max_g, new_grams))
                    updated[idx] = (bi, ing, new_grams)
                resolved = updated

        # Build final response
        final_ingredients: List[FinalIngredient] = []
        for bi, ing, grams in resolved:
            if ing:
                name = ing.name
                unit = ing.typical_unit
                grams_per_unit = float(ing.grams_per_unit) if ing.grams_per_unit else 1.0
            else:
                name = bi.name
                unit = "grams"
                grams_per_unit = 1.0
            unit_qty = self.grams_to_unit(grams, unit, grams_per_unit)
            final_ingredients.append(
                FinalIngredient(
                    name=name,
                    grams=round(grams, 2),
                    unit=unit,
                    unit_quantity=unit_qty,
                )
            )

        return FinalMealPlan(
            meal_name=blueprint.meal_name,
            ingredients=final_ingredients,
            preparation_steps=blueprint.preparation_steps,
        )
