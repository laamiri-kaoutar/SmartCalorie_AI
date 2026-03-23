from typing import List, Literal

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
    exercise_type: EXERCISE_TYPE = Field(..., description="Type of exercise")
    duration_minutes: float = Field(..., gt=0, description="Duration in minutes")
    intensity_level: INTENSITY_LEVEL = Field(..., description="low, moderate, or high")


class WorkoutInput(BaseModel):
    avg_heart_rate: float = Field(..., gt=0, description="Average heart rate during workout")
    exercises: List[ExerciseInput] = Field(..., min_length=1, description="List of exercises in the workout")


class ExerciseBreakdown(BaseModel):
    exercise_type: str
    duration_minutes: float
    estimated_calories: float


class PredictionResponse(BaseModel):
    total_calories: float = Field(..., description="Total estimated calories for the workout")
    breakdown: List[ExerciseBreakdown] = Field(..., description="Per-exercise calorie breakdown")
