from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

INTENSITY_LEVEL = Literal["low", "moderate", "high"]

EXERCISE_TYPE = Literal[
    "walking",
    "brisk walking",
    "jogging",
    "running",
    "cycling",
    "swimming",
    "jump rope",
    "push-ups",
    "pull-ups",
    "squats",
    "lunges",
    "strength training",
    "HIIT workout",
    "yoga",
    "pilates",
    "stair climbing",
]


class ExerciseInput(BaseModel):
    exercise_type: EXERCISE_TYPE = Field(...)
    duration_minutes: float = Field(..., gt=0)
    intensity_level: INTENSITY_LEVEL = Field(...)


class WorkoutInput(BaseModel):
    avg_heart_rate: float = Field(..., gt=0)
    exercises: List[ExerciseInput] = Field(..., min_length=1)


class ExerciseBreakdown(BaseModel):
    exercise_type: str
    duration_minutes: float
    estimated_calories: float


class PredictionResponse(BaseModel):
    total_calories: float
    breakdown: List[ExerciseBreakdown]


class WorkoutExerciseOut(BaseModel):
    exercise_type: str
    duration_minutes: float
    intensity_level: str


class WorkoutOut(BaseModel):
    id: int
    avg_heart_rate: Optional[float] = None
    total_calories: float
    created_at: datetime
    exercises: List[WorkoutExerciseOut] = []


class WorkoutHistory(BaseModel):
    workouts: List[WorkoutOut] = []

