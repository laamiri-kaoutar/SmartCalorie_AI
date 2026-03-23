import json
from pathlib import Path
from typing import List, Dict, Union

import pandas as pd
import joblib

# Resolve project root assuming this file lives in notebooks/ or backend/
BASE_DIR = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = BASE_DIR / "artifacts"


def prepare_features_for_prediction(
    records: Union[Dict, List[Dict]],
) -> pd.DataFrame:
    """
    Take raw user exercise data and return a DataFrame
    that is ready to be passed to model.predict().

    - records: dict (one exercise) or list of dicts (many exercises)
    """

    # 1) Load scaler and metadata saved from training
    with (ARTIFACTS_DIR / "preprocessing_metadata.json").open("r", encoding="utf-8") as f:
        metadata = json.load(f)
    scaler = joblib.load(ARTIFACTS_DIR / "standard_scaler.pkl")

    sex_map = metadata["sex_map"]
    intensity_map = metadata["intensity_map"]
    all_feature_cols = metadata["all_feature_cols"]
    numeric_cols = metadata["numeric_cols"]

    # 2) Turn input into a DataFrame (support one dict or list of dicts)
    if isinstance(records, dict):
        records = [records]

    df = pd.DataFrame(records)

    # 3) Check that all required columns are present
    required_cols = [
        "age",
        "sex",
        "height_cm",
        "weight_kg",
        "exercise_type",
        "duration_minutes",
        "intensity_level",
        "avg_heart_rate",
    ]

    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required fields: {missing_cols}")

    # 4) Convert numeric columns and check they are valid numbers
    numeric_to_convert = ["age", "height_cm", "weight_kg", "duration_minutes", "avg_heart_rate"]

    for col in numeric_to_convert:
        df[col] = pd.to_numeric(df[col], errors="coerce")
        if df[col].isna().any():
            raise ValueError(f"Column '{col}' must contain valid numbers (no NaN, no text).")

    # Basic sanity checks (you can adjust these limits)
    if (df["age"] <= 0).any():
        raise ValueError("Age must be > 0.")
    if (df["weight_kg"] <= 0).any():
        raise ValueError("Weight (kg) must be > 0.")
    if (df["duration_minutes"] <= 0).any():
        raise ValueError("Duration (minutes) must be > 0.")
    if (df["avg_heart_rate"] <= 0).any():
        raise ValueError("Average heart rate must be > 0.")

    # 5) Encode categorical columns (sex, intensity, exercise_type)
    # sex
    unknown_sex_values = [v for v in df["sex"].unique() if v not in sex_map]
    if unknown_sex_values:
        raise ValueError(f"Invalid sex values: {unknown_sex_values}. Expected: {list(sex_map.keys())}.")
    df["sex"] = df["sex"].map(sex_map)

    # intensity_level
    unknown_intensity_values = [v for v in df["intensity_level"].unique() if v not in intensity_map]
    if unknown_intensity_values:
        raise ValueError(
            f"Invalid intensity_level values: {unknown_intensity_values}. Expected: {list(intensity_map.keys())}."
        )
    df["intensity_level"] = df["intensity_level"].map(intensity_map)

    # exercise_type one-hot encoding
    df = pd.get_dummies(df, columns=["exercise_type"], dtype=int)

    # 6) Match training feature columns and order
    #    (add missing columns as 0, drop extra ones)
    X = df.reindex(columns=all_feature_cols, fill_value=0)

    # 7) Scale numeric columns with the saved scaler
    for col in numeric_cols:
        if col not in X.columns:
            raise ValueError(f"Expected numeric column '{col}' not found in features.")

    X[numeric_cols] = scaler.transform(X[numeric_cols])

    return X