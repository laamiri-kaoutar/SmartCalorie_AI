from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, conint, confloat, constr


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[constr(min_length=3)] = None
    age: Optional[conint(gt=18)] = Field(
        default=None,
        description="Age of the user, must be 18 or older.",
    )
    gender: Optional[Literal["M", "F"]] = None
    height: Optional[confloat(gt=0)] = Field(
        default=None,
        description="Height in centimeters (cm).",
        examples=[175.0],
    )
    weight: Optional[confloat(gt=0)] = Field(
        default=None,
        description="Weight in kilograms (kg).",
        examples=[75.5],
    )


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    is_admin: bool

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str

