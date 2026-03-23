import json
import uuid
from unittest.mock import MagicMock

import numpy as np

from schemas.plan import FinalIngredient, FinalMealPlan


def test_age_validation(client):
    r = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "minor@example.com",
            "password": "validpassword1",
            "age": 15,
        },
    )
    assert r.status_code == 422


def test_prediction_endpoint(client, metadata_dict, mocker, prediction_dummy):
    mocker.patch("services.ml_utils._load_metadata", return_value=metadata_dict)
    prediction_dummy.predict.return_value = np.array([500.0])

    email = f"pred_{uuid.uuid4().hex[:10]}@test.com"
    assert client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "validpassword1",
            "age": 25,
            "gender": "M",
            "height": 175.0,
            "weight": 70.0,
        },
    ).status_code == 201

    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "validpassword1"},
    ).json()["access_token"]

    r = client.post(
        "/api/v1/predict/calories",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "avg_heart_rate": 120.0,
            "exercises": [
                {
                    "exercise_type": "running",
                    "duration_minutes": 30.0,
                    "intensity_level": "moderate",
                },
            ],
        },
    )
    assert r.status_code == 200
    assert r.json()["total_calories"] == 500.0


def test_recommendation_endpoint(client, mocker):
    meal_json = json.dumps(
        {
            "meal_name": "Lunch",
            "ingredients": [{"name": "rice", "role": "carb", "min_g": 20, "max_g": 150}],
            "preparation_steps": ["Cook"],
        }
    )
    mock_resp = MagicMock()
    mock_resp.text = meal_json
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_resp
    mocker.patch("services.recommendation_service.genai.GenerativeModel", return_value=mock_model)

    mock_ps = MagicMock()

    def resolve(name):
        ing = MagicMock()
        ing.name = name
        ing.calories_per_100g = 130.0
        ing.typical_unit = "grams"
        ing.grams_per_unit = 1.0
        return ing

    mock_ps.return_value.resolve_ingredient.side_effect = resolve
    mock_ps.return_value.calculate_portions.return_value = FinalMealPlan(
        meal_name="Lunch",
        ingredients=[FinalIngredient(name="rice", grams=80.0, unit="grams", unit_quantity=80.0)],
        preparation_steps=["Cook"],
    )
    mocker.patch("services.recommendation_service.PortionService", mock_ps)

    email = f"rec_{uuid.uuid4().hex[:10]}@test.com"
    assert client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "validpassword1",
            "age": 25,
            "gender": "M",
            "height": 175.0,
            "weight": 70.0,
        },
    ).status_code == 201

    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "validpassword1"},
    ).json()["access_token"]

    r = client.post(
        "/api/v1/recommend/generate-plan",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "meals_per_day": 1,
            "snacks_per_day": 0,
            "preferences": {
                "vegan": False,
                "vegetarian": False,
                "cuisine": None,
                "allergies": [],
                "disliked_ingredients": [],
            },
            "predicted_burn": 0.0,
        },
    )
    assert r.status_code == 200
