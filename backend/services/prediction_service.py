"""
Singleton prediction service: loads best_model.pkl once and predicts workout calories.
Artifacts path is resolved with ml_utils.ARTIFACTS_DIR (repo or backend mount).
"""
from contextlib import nullcontext
import time
from typing import List

import joblib
import mlflow
from fastapi import HTTPException, status

from core.config import settings
from core.metrics import ML_PREDICTION_LATENCY, PREDICTED_CALORIES_VALUE
from db.session import SessionLocal
from models.user import User
from schemas.workout import ExerciseBreakdown, PredictionResponse, WorkoutHistory, WorkoutInput, WorkoutOut, WorkoutExerciseOut
from services import ml_utils
from services.repository import Repository
from models.workout import WorkoutExercise

MODEL_PATH = ml_utils.ARTIFACTS_DIR / "best_model.pkl"


class PredictionService:
    _instance = None

    def __new__(cls) -> "PredictionService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if hasattr(self, "_model") and self._model is not None:
            return

        # Configure MLflow tracking (service name inside Docker)
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI or "http://mlflow:5000")

        # FALLBACK: self._model = joblib.load(MODEL_PATH)
        try:
            self._model = mlflow.pyfunc.load_model("models:/CaloriePredictor/Production")
            print("DEBUG: Model loaded from MLflow Registry (Production)")
        except Exception as e:
            print(f"WARNING: MLflow load failed, using local fallback. Error: {e}")
            self._model = joblib.load(MODEL_PATH)

    def predict_workout_calories(
        self,
        user: User,
        workout_input: WorkoutInput,
    ) -> PredictionResponse:
        """
        Build one record per exercise (user static + shared avg_heart_rate + exercise),
        map user gender -> sex, height -> height_cm, prepare features, predict, sum and breakdown.
        """
        if user.age is None or user.gender is None or user.height is None or user.weight is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User profile must include age, gender, height, and weight for calorie prediction.",
            )
        mlflow_ctx = nullcontext()
        mlflow_enabled = False
        try:
            mlflow_ctx = mlflow.start_run(run_name="Inference_Request", nested=True)
            mlflow_enabled = True
        except Exception:
            mlflow_enabled = False

        with mlflow_ctx:
            if mlflow_enabled:
                try:
                    mlflow.set_tag("type", "inference")
                    mlflow.log_param("avg_heart_rate", float(workout_input.avg_heart_rate))
                    mlflow.log_param("num_exercises", int(len(workout_input.exercises)))
                except Exception:
                    pass

            records: List[dict] = []
            for ex in workout_input.exercises:
                record = {
                    "age": user.age,
                    "sex": {"M": 0, "F": 1}.get(user.gender) if user.gender else 0,
                    "height_cm": user.height,
                    "weight_kg": user.weight,
                    "duration_minutes": ex.duration_minutes,
                    "intensity_level": ex.intensity_level,
                    "avg_heart_rate": workout_input.avg_heart_rate,
                    "exercise_type": ex.exercise_type,
                }
                records.append(record)

            X = ml_utils.prepare_features_for_prediction(records)
            prediction_start = time.time()
            preds = self._model.predict(X)
            prediction_latency = time.time() - prediction_start
            try:
                ML_PREDICTION_LATENCY.observe(float(prediction_latency))
            except Exception:
                pass
            pred_list = preds.tolist() if hasattr(preds, "tolist") else list(preds)
            try:
                for value in pred_list:
                    PREDICTED_CALORIES_VALUE.observe(float(value))
            except Exception:
                pass

            breakdown = [
                ExerciseBreakdown(
                    exercise_type=workout_input.exercises[i].exercise_type,
                    duration_minutes=workout_input.exercises[i].duration_minutes,
                    estimated_calories=round(pred_list[i], 2),
                )
                for i in range(len(pred_list))
            ]
            total_calories = round(sum(pred_list), 2)
            try:
                PREDICTED_CALORIES_VALUE.observe(float(total_calories))
            except Exception:
                pass

            if mlflow_enabled:
                try:
                    for i, item in enumerate(breakdown):
                        mlflow.log_metric(f"exercise_{i}_estimated_calories", float(item.estimated_calories), step=i)
                    mlflow.log_metric("total_calories", float(total_calories))
                except Exception:
                    pass

            response = PredictionResponse(total_calories=total_calories, breakdown=breakdown)

        try:
            db = SessionLocal()
            try:
                Repository().save_workout(
                    db=db,
                    user_id=int(user.id),
                    workout_input=workout_input,
                    total_calories=total_calories,
                )
            finally:
                db.close()
        except Exception:
            pass

        return response

    def get_workout_history(self, db, user_id: int) -> WorkoutHistory:
        workouts = Repository().get_user_workouts(db, int(user_id))
        out: list[WorkoutOut] = []
        for w in workouts:
            exercises = db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == w.id).all()
            out.append(
                WorkoutOut(
                    id=w.id,
                    avg_heart_rate=w.avg_heart_rate,
                    total_calories=w.total_calories,
                    created_at=w.created_at,
                    exercises=[
                        WorkoutExerciseOut(
                            exercise_type=e.exercise_type,
                            duration_minutes=e.duration_minutes,
                            intensity_level=e.intensity_level,
                        )
                        for e in exercises
                    ],
                )
            )
        return WorkoutHistory(workouts=out)
