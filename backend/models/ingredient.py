from sqlalchemy import Column, Float, Integer, String

from db.session import Base


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    fdc_id = Column(Integer, unique=True, nullable=False, index=True)
    name = Column(String(500), nullable=False)  # Official USDA name
    simplified_name = Column(String(255), index=True, nullable=False)  # For LLM matching
    category = Column(String(100), nullable=False)
    calories_per_100g = Column(Float, nullable=False)
    protein_g = Column(Float, nullable=False, default=0.0)
    carbs_g = Column(Float, nullable=False, default=0.0)
    fat_g = Column(Float, nullable=False, default=0.0)
    typical_unit = Column(String(50), nullable=False, default="grams", server_default="grams")
    grams_per_unit = Column(Float, nullable=False, default=1.0, server_default="1.0")
