import numpy as np

from services.ml_utils import prepare_features_for_prediction
from services.nutrition_service import NutritionService


def test_tdee_math(mock_user):
    # Mifflin–St Jeor (male): BMR = 10*w + 6.25*h - 5*age + 5; TDEE = BMR * 1.2 (sedentary default)
    expected_bmr = 10 * 75 + 6.25 * 180 - 5 * 25 + 5
    expected_tdee = expected_bmr * NutritionService.DEFAULT_ACTIVITY_FACTOR
    assert NutritionService.calculate_tdee(mock_user) == expected_tdee


def test_calorie_weights():
    total = 2000.0
    meals_count = 3
    snacks_count = 2
    meal_weight = 1.0
    snack_weight = 0.5
    total_weight = meals_count * meal_weight + snacks_count * snack_weight
    assert total_weight == 4.0

    slots = NutritionService.split_calories_to_slots(
        total_calories=total,
        meals_count=meals_count,
        snacks_count=snacks_count,
        meal_weight=meal_weight,
        snack_weight=snack_weight,
    )
    expected_meal = round(total * (meal_weight / total_weight), 2)
    expected_snack = round(total * (snack_weight / total_weight), 2)
    assert slots == [expected_meal, expected_meal, expected_meal, expected_snack, expected_snack]
    assert expected_meal == 500.0
    assert expected_snack == 250.0


def test_feature_mapping(patch_ml_artifacts):
    base = {
        "age": 25,
        "height_cm": 180.0,
        "weight_kg": 75.0,
        "duration_minutes": 30.0,
        "intensity_level": "moderate",
        "avg_heart_rate": 120.0,
        "exercise_type": "running",
    }
    records = [
        {**base, "gender": "M"},
        {**base, "gender": "F"},
    ]
    df = prepare_features_for_prediction(records)

    assert int(df.loc[0, "sex"]) == 0
    assert int(df.loc[1, "sex"]) == 1
    assert df.loc[0, "exercise_type_running"] == 1.0
    assert df.loc[1, "exercise_type_running"] == 1.0
    assert np.isclose(df.loc[0, "exercise_type_walking"], 0.0)
