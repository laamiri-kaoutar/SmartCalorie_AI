from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from db.session import get_db
from models.user import User
from schemas.user import UserOut
from services.user_service import UserService


router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    return UserService(db).get_user_profile(current_user)


@router.put("/me", response_model=UserOut)
def update_me(
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    return UserService(db).update_user_profile(int(current_user.id), update_data)

