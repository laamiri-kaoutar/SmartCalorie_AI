from __future__ import annotations

from sqlalchemy.orm import Session

from models.ingredient import Ingredient
from models.user import User
from scripts.usda_harvester import _get_usda_api_key, harvest_category
from services.repository import Repository


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = Repository()

    def list_users(self) -> list[User]:
        return self.repository.get_all_users(self.db)

    def delete_user(self, user_id: int) -> bool:
        return self.repository.delete_user(self.db, int(user_id))

    def get_stats(self) -> dict[str, int]:
        return self.repository.get_system_stats(self.db)

    def get_analytics(self) -> dict[str, list[dict[str, int | str]]]:
        return {
            "activity": self.repository.get_daily_activity_stats(self.db),
            "cuisines": self.repository.get_cuisine_distribution(self.db),
            "demographics": self.repository.get_user_demographics(self.db),
        }

    def search_ingredients(self, query: str) -> list[Ingredient]:
        return self.repository.search_ingredients(self.db, query)

    def harvest_ingredients(self, category: str) -> dict[str, int | str]:
        api_key = _get_usda_api_key()
        if not api_key:
            return {"saved": 0, "category": category}
        saved = harvest_category(self.db, api_key, category)
        self.db.commit()
        return {"saved": int(saved), "category": category}

