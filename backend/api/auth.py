from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.user import UserCreate, UserOut, UserLogin, Token
from services.user_service import UserService


router = APIRouter(tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    service = UserService(db)
    return service.create_user(user_in)


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    service = UserService(db)
    return service.authenticate_user(login_data)

