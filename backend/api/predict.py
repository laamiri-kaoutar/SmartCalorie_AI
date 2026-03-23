from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from db.session import get_db
from models.user import User
from schemas.workout import PredictionResponse, WorkoutHistory, WorkoutInput
from services.prediction_service import PredictionService

router = APIRouter(tags=["predict"])


def get_prediction_service() -> PredictionService:
    return PredictionService()


@router.post("/calories", response_model=PredictionResponse)
def predict_calories(
    workout_input: WorkoutInput,
    current_user: User = Depends(get_current_user),
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> PredictionResponse:
    return prediction_service.predict_workout_calories(current_user, workout_input)


@router.get("/history", response_model=WorkoutHistory)
def workout_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> WorkoutHistory:
    return prediction_service.get_workout_history(db=db, user_id=int(current_user.id))
