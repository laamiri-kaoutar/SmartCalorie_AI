from pathlib import Path
from typing import Any, Dict, List

import json

import joblib
import pandas as pd


# In Docker, artifacts are mounted to /app/artifacts
ARTIFACTS_DIR = Path("/app/artifacts")
METADATA_PATH = ARTIFACTS_DIR / "preprocessing_metadata.json"
SCALER_PATH = ARTIFACTS_DIR / "standard_scaler.pkl"


def _load_metadata() -> Dict[str, Any]:
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_scaler():
    return joblib.load(SCALER_PATH)


def prepare_features_for_prediction(records: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Turn a list of raw records into a feature DataFrame ready for model.predict().

    Steps:
    - Load preprocessing_metadata.json and standard_scaler.pkl from /app/artifacts/
    - Apply `sex_map` and `intensity_map` from metadata
    - One-hot encode `exercise_type` with pd.get_dummies
    - Reindex to `all_feature_cols` (from metadata) with fill_value=0 so the
      column order and set exactly match training
    - ScIale only the columns listed in `numeric_cols`
    """
    if not records:
        raise ValueError("No records provided for prediction.")

    metadata = _load_metadata()
    scaler = _load_scaler()

    sex_map: Dict[str, int] = metadata["sex_map"]
    intensity_map: Dict[str, int] = metadata["intensity_map"]
    all_feature_cols: List[str] = metadata["all_feature_cols"]
    numeric_cols: List[str] = metadata["numeric_cols"]

    df = pd.DataFrame(records)

    # Map sex / gender to numeric codes
    if "sex" not in df.columns:
        if "gender" in df.columns:
            df["sex"] = df["gender"].map(sex_map)
        else:
            raise ValueError("Records must include 'sex' or 'gender' so sex_map can be applied.")
    df["sex"] = pd.to_numeric(df["sex"], errors="coerce").fillna(0).astype(int)

    # Map intensity level strings to numeric codes expected by the model
    if "intensity_level" in df.columns:
        if df["intensity_level"].dtype == object or df["intensity_level"].dtype.name == "string":
            df["intensity_level"] = df["intensity_level"].map(intensity_map)
        df["intensity_level"] = pd.to_numeric(df["intensity_level"], errors="coerce").fillna(0).astype(int)

    # One-hot encode exercise_type and then align to all_feature_cols
    if "exercise_type" in df.columns:
        dummies = pd.get_dummies(df["exercise_type"], prefix="exercise_type")
        df = df.drop(columns=["exercise_type"])
        df = pd.concat([df, dummies], axis=1)

    # Align columns and order to exactly match training
    df = df.reindex(columns=all_feature_cols, fill_value=0)

    # Scale only numeric columns using the fitted scaler
    df[numeric_cols] = scaler.transform(df[numeric_cols].astype(float))

    # XGBoost requires dtypes to be int, float, bool or category (no object/str)
    df = df.astype(float)

    return df

