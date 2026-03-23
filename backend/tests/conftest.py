import json
import os
from contextlib import nullcontext
from pathlib import Path

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "pytest-jwt-secret")

from fastapi.testclient import TestClient
from sklearn.preprocessing import StandardScaler

from main import app
from models.user import User
from services import ml_utils


@pytest.fixture(autouse=True)
def silence_mlflow_globally(mocker):
    mocker.patch("mlflow.set_tracking_uri", return_value=None)
    mocker.patch("mlflow.set_experiment", return_value=None)
    mocker.patch("mlflow.start_run", lambda **kwargs: nullcontext())


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_user():
    return User(
        id=1,
        email="fixture@example.com",
        hashed_password="hashed",
        age=25,
        weight=75.0,
        height=180.0,
        gender="M",
    )


def _artifacts_metadata_path() -> Path:
    """Resolve artifacts when tests live under backend/tests (local) or /app/tests (Docker)."""
    here = Path(__file__).resolve().parent
    candidates = (
        here.parent / "artifacts",  # Docker: /app/tests -> /app/artifacts
        here.parent.parent / "artifacts",  # Local: repo root .../SmartCalorie_AI/artifacts
    )
    for base in candidates:
        p = base / "preprocessing_metadata.json"
        if p.is_file():
            return p
    raise FileNotFoundError(
        f"preprocessing_metadata.json not found under {list(candidates)}"
    )


@pytest.fixture
def metadata_dict():
    path = _artifacts_metadata_path()
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def fitted_scaler(metadata_dict):
    scaler = StandardScaler()
    numeric_cols = metadata_dict["numeric_cols"]
    assert numeric_cols == ["age", "weight_kg", "duration_minutes", "avg_heart_rate"]
    scaler.fit([[25.0, 75.0, 30.0, 120.0]])
    return scaler


@pytest.fixture
def patch_ml_artifacts(monkeypatch, metadata_dict, fitted_scaler):
    def load_metadata():
        return metadata_dict

    def load_scaler():
        return fitted_scaler

    monkeypatch.setattr(ml_utils, "_load_metadata", load_metadata)
    monkeypatch.setattr(ml_utils, "_load_scaler", load_scaler)
