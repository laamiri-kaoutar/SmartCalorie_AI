import json
import os
from contextlib import nullcontext
from pathlib import Path
from unittest.mock import MagicMock

import joblib
import numpy as np
import pytest
from sklearn.preprocessing import StandardScaler

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "pytest-jwt-secret")

from fastapi.testclient import TestClient

from main import app

joblib_dummy_model = MagicMock()


@pytest.fixture(autouse=True)
def silence_mlflow_globally(mocker):
    mocker.patch("mlflow.set_tracking_uri", return_value=None)
    mocker.patch("mlflow.set_experiment", return_value=None)
    mocker.patch("mlflow.start_run", lambda **kwargs: nullcontext())


@pytest.fixture(autouse=True)
def stub_joblib_load_globally(mocker):
    scaler = StandardScaler()
    scaler.fit(np.array([[25.0, 70.0, 30.0, 120.0]], dtype=float))
    real_load = joblib.load

    def side_effect(path, *args, **kwargs):
        name = Path(path).name
        if name == "best_model.pkl":
            return joblib_dummy_model
        if name == "standard_scaler.pkl":
            return scaler
        return real_load(path, *args, **kwargs)

    mocker.patch("joblib.load", side_effect=side_effect)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def prediction_dummy():
    return joblib_dummy_model


@pytest.fixture
def metadata_dict():
    here = Path(__file__).resolve().parent
    for base in (here.parent / "artifacts", here.parent.parent / "artifacts"):
        p = base / "preprocessing_metadata.json"
        if p.is_file():
            with open(p, encoding="utf-8") as f:
                return json.load(f)
    pytest.skip("preprocessing_metadata.json not found")
