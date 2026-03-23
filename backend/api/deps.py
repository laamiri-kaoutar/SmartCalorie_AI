from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from db.session import get_db
from models.user import User


def get_current_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return current_user

