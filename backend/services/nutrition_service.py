"""
Math Engine: TDEE (Mifflin-St Jeor), daily target, and calorie split across meals/snacks.
"""
from typing import List, Optional

from models.user import User


class NutritionService:
    

    # Default activity factor (sedentary) if not provided
    DEFAULT_ACTIVITY_FACTOR = 1.2

    @staticmethod
    def calculate_tdee(user: User, activity_factor: Optional[float] = None) -> float:

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
    def split_calories_to_slots(
        total_calories: float,
        meals_count: int,
        snacks_count: int,
        meal_weight: float = 1.0,
        snack_weight: float = 0.5,
    ) -> List[float]:
       
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
