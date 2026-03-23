import pytest

from models.user import User
from services.nutrition_service import NutritionService


def test_tdee():
    user = User(
        id=1,
        email="t@example.com",
        hashed_password="x",
        age=25,
        weight=70.0,
        height=175.0,
        gender="M",
    )
    assert NutritionService.calculate_tdee(user, activity_factor=1.0) == pytest.approx(1682, abs=15)


def test_splitting():
    slots = NutritionService.split_calories_to_slots(
        total_calories=2000.0,
        meals_count=3,
        snacks_count=2,
        meal_weight=1.0,
        snack_weight=0.5,
    )
    assert slots[:3] == [500.0, 500.0, 500.0]
    assert slots[3:] == [250.0, 250.0]
