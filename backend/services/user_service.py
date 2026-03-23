from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from core.security import get_password_hash, verify_password, create_access_token
from models.user import User
from schemas.user import UserCreate, UserLogin, UserOut, Token
from services.repository import Repository


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = Repository()

    # ------------------------
    # Helpers
    # ------------------------
    def _get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    # ------------------------
    # Public API
    # ------------------------
    def create_user(self, user_in: UserCreate) -> UserOut:
        existing = self._get_user_by_email(user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered.",
            )

        hashed_password = get_password_hash(user_in.password)

        db_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            age=user_in.age,
            gender=user_in.gender,
            height=user_in.height,
            weight=user_in.weight,
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)

        return UserOut.model_validate(db_user)

    def authenticate_user(self, login_data: UserLogin) -> Token:
        user = self._get_user_by_email(login_data.email)
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
            )

        access_token = create_access_token({"sub": user.email})
        return Token(access_token=access_token, token_type="bearer")

    def get_user_profile(self, user: User) -> UserOut:
        return UserOut.model_validate(user)

    def update_user_profile(self, user_id: int, update_data: dict) -> UserOut:
        updated = self.repository.update_user_profile(self.db, int(user_id), update_data)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return UserOut.model_validate(updated)

