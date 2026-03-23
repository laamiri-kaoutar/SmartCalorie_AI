from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from db.session import get_db
from models.user import User
from schemas.plan import (
    GeneratePlanInput,
    GeneratePlanResponse,
    PlanDetails,
    PlanHistory,
)
from services.recommendation_service import RecommendationService


router = APIRouter(tags=["recommend"])


def get_recommendation_service() -> RecommendationService:
    return RecommendationService()


@router.post(
    "/generate-plan",
    response_model=GeneratePlanResponse,
    summary="Generate an agentic daily meal plan",
)
def generate_plan(
    body: GeneratePlanInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> GeneratePlanResponse:
    return recommendation_service.generate_daily_plan(db=db, user=current_user, body=body)


@router.get("/history", response_model=PlanHistory)
def plan_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> PlanHistory:
    return recommendation_service.get_plan_history(db=db, user_id=int(current_user.id))


@router.get("/history/{plan_id}", response_model=PlanDetails)
def plan_details(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> PlanDetails:
    return recommendation_service.get_plan_details(db=db, user_id=int(current_user.id), plan_id=int(plan_id))

