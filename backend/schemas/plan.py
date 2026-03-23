from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class BlueprintIngredient(BaseModel):
    name: str
    role: str
    min_g: Optional[float] = None
    max_g: Optional[float] = None
    suggested_g: Optional[float] = None


class MealBlueprint(BaseModel):
    meal_name: str
    ingredients: List[BlueprintIngredient]
    preparation_steps: List[str] = []


class FinalIngredient(BaseModel):
    name: str
    grams: float
    unit: str
    unit_quantity: float


class FinalMealPlan(BaseModel):
    meal_name: str
    ingredients: List[FinalIngredient]
    preparation_steps: List[str] = []


class MealPreferences(BaseModel):
    vegan: bool = False
    vegetarian: bool = False
    cuisine: Optional[str] = None
    allergies: List[str] = []
    disliked_ingredients: List[str] = []


class GeneratePlanInput(BaseModel):
    meals_per_day: int
    snacks_per_day: int
    preferences: MealPreferences
    predicted_burn: float  # workout calories only


class SlotPlan(BaseModel):
    slot_name: str
    target_calories: float
    meal: FinalMealPlan


class GeneratePlanResponse(BaseModel):
    total_target_calories: float
    slots: List[SlotPlan]


class MealIngredientOut(BaseModel):
    ingredient_id: int
    ingredient_name: str
    grams: float
    unit_quantity: float
    unit_name: str


class MealEntryOut(BaseModel):
    id: int
    name: str
    entry_type: str  # MEAL | SNACK
    target_calories: float
    preparation_steps: List[str] = []
    ingredients: List[MealIngredientOut] = []


class PlanOut(BaseModel):
    id: int
    date: date
    total_target_calories: float


class PlanHistory(BaseModel):
    plans: List[PlanOut] = []


class PlanDetails(BaseModel):
    plan: PlanOut
    meals: List[MealEntryOut] = []

