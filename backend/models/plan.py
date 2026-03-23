from __future__ import annotations

import enum

from sqlalchemy import (
    Column,
    Date,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)

from db.session import Base


class MealEntryType(str, enum.Enum):
    MEAL = "MEAL"
    SNACK = "SNACK"


class DailyPlan(Base):
    __tablename__ = "daily_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    total_target_calories = Column(Float, nullable=False, default=0.0)


class MealEntry(Base):
    __tablename__ = "meal_entries"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("daily_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    entry_type = Column(Enum(MealEntryType, name="meal_entry_type"), nullable=False)
    target_calories = Column(Float, nullable=False, default=0.0)
    preparation_steps = Column(Text, nullable=False, default="")


class MealIngredient(Base):
    __tablename__ = "meal_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    meal_entry_id = Column(Integer, ForeignKey("meal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id", ondelete="RESTRICT"), nullable=False, index=True)
    grams = Column(Float, nullable=False, default=0.0)
    unit_quantity = Column(Float, nullable=False, default=0.0)
    unit_name = Column(String(50), nullable=False, default="grams")

