"""
Math Engine: TDEE (Mifflin-St Jeor), daily target, and calorie split across meals/snacks.
"""
from typing import List, Optional

from models.user import User


class NutritionService:
    """Calculates TDEE, daily calorie target, and per-slot calorie allocation."""

    # Default activity factor (sedentary) if not provided
    DEFAULT_ACTIVITY_FACTOR = 1.2

    @staticmethod
    def calculate_tdee(user: User, activity_factor: Optional[float] = None) -> float:
        """
        Total Daily Energy Expenditure using Mifflin-St Jeor equation.
        BMR (men)  = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
        BMR (women)= 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
        TDEE = BMR * activity_factor
        """
        if not all([user.weight, user.height, user.age]):
            return 0.0
        w, h, a = float(user.weight), float(user.height), int(user.age)
        if user.gender and user.gender.upper() == "F":
            bmr = 10 * w + 6.25 * h - 5 * a - 161
        else:
            bmr = 10 * w + 6.25 * h - 5 * a + 5
        factor = activity_factor if activity_factor is not None else NutritionService.DEFAULT_ACTIVITY_FACTOR
        return max(0.0, bmr * factor)

    @staticmethod
    def get_daily_target(user: User, calories_burned: float, activity_factor: Optional[float] = None) -> float:
        """Daily calorie target = TDEE + predicted burn (e.g. from workout)."""
        tdee = NutritionService.calculate_tdee(user, activity_factor)
        return tdee + float(calories_burned)

    @staticmethod
    def split_calories_to_slots(
        total_calories: float,
        meals_count: int,
        snacks_count: int,
        meal_weight: float = 1.0,
        snack_weight: float = 0.5,
    ) -> List[float]:
        """
        Split total_calories across meal and snack slots by weight.
        Meals = meal_weight (1.0), Snacks = snack_weight (0.5).
        Returns a list of calorie targets: [meal1, ..., mealN, snack1, ..., snackM].
        """
        if meals_count <= 0 and snacks_count <= 0:
            return []
        total_weight = meals_count * meal_weight + snacks_count * snack_weight
        if total_weight <= 0:
            return []
        targets: List[float] = []
        for _ in range(meals_count):
            targets.append(round(total_calories * (meal_weight / total_weight), 2))
        for _ in range(snacks_count):
            targets.append(round(total_calories * (snack_weight / total_weight), 2))
        return targets
