import json
from contextlib import nullcontext
from pathlib import Path
from unittest.mock import MagicMock

import joblib
import numpy as np
import pytest

from models.user import User
from schemas.plan import FinalIngredient, FinalMealPlan, GeneratePlanInput, MealPreferences
from schemas.workout import ExerciseInput, WorkoutInput
from services.nutrition_service import NutritionService
from services.prediction_service import PredictionService
from services.recommendation_service import RecommendationService


@pytest.fixture(autouse=True)
def reset_prediction_singleton():
    PredictionService._instance = None
    yield
    PredictionService._instance = None


@pytest.fixture(autouse=True)
def stub_prediction_model_loading(mocker):
    mocker.patch(
        "services.prediction_service.mlflow.pyfunc.load_model",
        side_effect=RuntimeError("use local fallback in tests"),
    )
    # `joblib` is a shared module: patching only `return_value` breaks ml_utils scaler loading.
    real_load = joblib.load

    def joblib_load_side_effect(path, *args, **kwargs):
        if Path(path).name == "best_model.pkl":
            return MagicMock()
        return real_load(path, *args, **kwargs)

    mocker.patch(
        "services.prediction_service.joblib.load",
        side_effect=joblib_load_side_effect,
    )


def mlflow_nullcontext(*args, **kwargs):
    return nullcontext()


def test_ml_prediction_flow(mocker, mock_user):
    mocker.patch("services.prediction_service.mlflow.start_run", mlflow_nullcontext)
    mock_db = MagicMock()
    mocker.patch("services.prediction_service.SessionLocal", return_value=mock_db)
    mocker.patch("services.prediction_service.Repository", return_value=MagicMock())

    preds = np.array([100.456, 200.789])
    service = PredictionService()
    service._model.predict = mocker.MagicMock(return_value=preds)

    workout = WorkoutInput(
        avg_heart_rate=120.0,
        exercises=[
            ExerciseInput(exercise_type="running", duration_minutes=30.0, intensity_level="moderate"),
            ExerciseInput(exercise_type="walking", duration_minutes=15.0, intensity_level="low"),
        ],
    )

    out = service.predict_workout_calories(mock_user, workout)

    service._model.predict.assert_called_once()
    assert out.total_calories == round(float(preds.sum()), 2)
    assert out.breakdown[0].estimated_calories == round(float(preds[0]), 2)
    assert out.breakdown[1].estimated_calories == round(float(preds[1]), 2)


def test_gemini_retry_logic(mocker):
    mocker.patch("services.recommendation_service.mlflow.start_run", mlflow_nullcontext)

    svc = RecommendationService()

    calls = {"n": 0}

    def gen_side_effect(*args, **kwargs):
        calls["n"] += 1
        r = MagicMock()
        if calls["n"] == 1:
            r.text = json.dumps(
                {
                    "meal_name": "RetryMeal",
                    "ingredients": [
                        {"name": "nonexistent_xyz_ingredient", "role": "protein", "min_g": 50, "max_g": 100},
                    ],
                    "preparation_steps": [],
                }
            )
        else:
            r.text = json.dumps(
                {
                    "meal_name": "OkMeal",
                    "ingredients": [
                        {"name": "oats", "role": "carb", "min_g": 20, "max_g": 120},
                        {"name": "egg", "role": "protein", "min_g": 40, "max_g": 100},
                    ],
                    "preparation_steps": ["mix"],
                }
            )
        return r

    mocker.patch.object(svc.model, "generate_content", side_effect=gen_side_effect)

    mock_ps = MagicMock()

    def resolve(name: str):
        if name == "nonexistent_xyz_ingredient":
            return None
        ing = MagicMock()
        ing.name = name
        ing.calories_per_100g = 150.0
        ing.typical_unit = "grams"
        ing.grams_per_unit = 1.0
        return ing

    mock_ps.resolve_ingredient.side_effect = resolve
    mock_ps.calculate_portions.return_value = FinalMealPlan(
        meal_name="OkMeal",
        ingredients=[
            FinalIngredient(name="egg", grams=50.0, unit="grams", unit_quantity=50.0),
        ],
        preparation_steps=["mix"],
    )
    mocker.patch("services.recommendation_service.PortionService", return_value=mock_ps)

    user = User(
        id=2,
        email="u@example.com",
        hashed_password="x",
        age=25,
        weight=75.0,
        height=180.0,
        gender="M",
    )
    body = GeneratePlanInput(
        meals_per_day=1,
        snacks_per_day=0,
        preferences=MealPreferences(),
        predicted_burn=0.0,
    )
    db = MagicMock()

    svc.generate_daily_plan(db, user, body)

    assert calls["n"] == 2
    assert svc.model.generate_content.call_count == 2


def test_persistence_hooks(mocker, mock_user):
    mocker.patch("services.prediction_service.mlflow.start_run", mlflow_nullcontext)
    mocker.patch("services.recommendation_service.mlflow.start_run", mlflow_nullcontext)

    mock_db_pred = MagicMock()
    mocker.patch("services.prediction_service.SessionLocal", return_value=mock_db_pred)
    repo_pred = MagicMock()
    mocker.patch("services.prediction_service.Repository", return_value=repo_pred)

    preds = np.array([42.4242])
    pred_service = PredictionService()
    pred_service._model.predict = mocker.MagicMock(return_value=preds)

    workout = WorkoutInput(
        avg_heart_rate=110.0,
        exercises=[
            ExerciseInput(exercise_type="cycling", duration_minutes=40.0, intensity_level="high"),
        ],
    )
    pred_out = pred_service.predict_workout_calories(mock_user, workout)

    repo_pred.save_workout.assert_called_once()
    sw = repo_pred.save_workout.call_args.kwargs
    assert sw["user_id"] == mock_user.id
    assert sw["total_calories"] == pred_out.total_calories
    assert sw["workout_input"] == workout

    svc = RecommendationService()
    mocker.patch.object(
        svc.model,
        "generate_content",
        return_value=MagicMock(
            text=json.dumps(
                {
                    "meal_name": "PersistMeal",
                    "ingredients": [{"name": "rice", "role": "carb", "min_g": 30, "max_g": 150}],
                    "preparation_steps": [],
                }
            )
        ),
    )

    mock_ps = MagicMock()

    def resolve(name: str):
        ing = MagicMock()
        ing.name = name
        ing.calories_per_100g = 130.0
        ing.typical_unit = "grams"
        ing.grams_per_unit = 1.0
        return ing

    mock_ps.resolve_ingredient.side_effect = resolve
    mock_ps.calculate_portions.return_value = FinalMealPlan(
        meal_name="PersistMeal",
        ingredients=[FinalIngredient(name="rice", grams=100.0, unit="grams", unit_quantity=100.0)],
        preparation_steps=[],
    )
    mocker.patch("services.recommendation_service.PortionService", return_value=mock_ps)

    repo_rec = MagicMock()
    mocker.patch("services.recommendation_service.Repository", return_value=repo_rec)

    body = GeneratePlanInput(
        meals_per_day=1,
        snacks_per_day=0,
        preferences=MealPreferences(),
        predicted_burn=0.0,
    )
    db_rec = MagicMock()
    expected_total = NutritionService.calculate_tdee(mock_user)

    rec_out = svc.generate_daily_plan(db_rec, mock_user, body)

    repo_rec.save_daily_plan.assert_called_once()
    sd = repo_rec.save_daily_plan.call_args.kwargs
    assert sd["user_id"] == mock_user.id
    assert sd["plan_response"].total_target_calories == rec_out.total_target_calories
    assert rec_out.total_target_calories == pytest.approx(expected_total)
