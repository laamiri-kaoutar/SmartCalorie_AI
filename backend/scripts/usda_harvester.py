
import re
import sys
import time
from pathlib import Path

import requests

# Ensure backend is on path
_backend = Path(__file__).resolve().parents[1]
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from db.session import SessionLocal, engine, Base
from models.ingredient import Ingredient


def _read_key_from_env_file(env_path: Path) -> str:
    """Parse a .env file for USDA_API_KEY. Handles BOM, CRLF, quotes, spaces."""
    try:
        with open(env_path, "r", encoding="utf-8-sig") as f:
            for line in f:
                line = line.strip().split("#")[0].strip()
                if not line or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                if k.strip() != "USDA_API_KEY":
                    continue
                key = v.strip().strip('"').strip("'").strip()
                if key:
                    return key
    except Exception:
        pass
    return ""


def _get_usda_api_key() -> str:
    """Get USDA API key from Settings (Docker injects env via env_file)."""
    from core.config import settings

    return (settings.USDA_API_KEY or "").strip()

# FDC API
BASE_URL = "https://api.nal.usda.gov/fdc/v1"
DATA_TYPES = ["Foundation Foods", "SR Legacy"]
# Standard nutrient IDs (per 100g in Foundation/SR Legacy)
NUTRIENT_ENERGY_KCAL = 1008
NUTRIENT_PROTEIN = 1003
NUTRIENT_FAT = 1004
NUTRIENT_CARBS = 1005

CATEGORIES = [
    "Vegetables",
    "Fruits",
    "Grains",
    "Meats",
    "Dairy",
    "Legumes",
    "Oils",
    "Spices",
]

# Phrases to strip for simplified name (order matters: longer first)
STRIP_PHRASES = [
    ", raw, skinless",
    ", raw, with skin",
    ", cooked, skinless",
    ", cooked, with skin",
    ", broiler or fryers",
    ", broiler",
    ", without skin",
    ", skinless",
    ", raw",
    ", cooked",
    ", dried",
    ", uncooked",
    ", whole",
    ", chopped",
    ", sliced",
    ", fresh",
    ", unprepared",
    ", unenriched",
    ", enriched",
    ", regular",
    ", all classes",
    ", USDA commodity",
    ", SR",
    ", (Foundation)",
]


def simplify_name(usda_description: str) -> str:
    """Strip extra USDA descriptions for LLM matching (e.g. 'Chicken, raw, skinless' -> 'chicken')."""
    if not usda_description or not isinstance(usda_description, str):
        return ""
    s = usda_description.strip()
    for phrase in STRIP_PHRASES:
        s = re.sub(re.escape(phrase), "", s, flags=re.IGNORECASE)
    s = re.sub(r",\s*,", ",", s)
    s = s.strip(" ,")
    s = re.sub(r"\s+", " ", s).strip()
    return s.lower() if s else usda_description.lower()


def search_foods(api_key: str, query: str, page_size: int = 50) -> list:
    """Call FDC Search API; return list of food items (abridged)."""
    if not api_key:
        raise ValueError("USDA_API_KEY is not set")
    url = f"{BASE_URL}/foods/search"
    params = {"api_key": api_key}
    payload = {
        "query": query,
        "dataType": DATA_TYPES,
        "pageSize": page_size,
        "pageNumber": 1,
    }
    resp = requests.post(url, params=params, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get("foods") or []


def get_food_details(api_key: str, fdc_id: int) -> dict | None:
    """Call FDC Food Details API for one food."""
    url = f"{BASE_URL}/food/{fdc_id}"
    params = {"api_key": api_key}
    resp = requests.get(url, params=params, timeout=30)
    if resp.status_code != 200:
        return None
    return resp.json()


def extract_nutrients(food: dict) -> tuple[float, float, float, float]:
    """Extract energy (kcal), protein, fat, carbs per 100g from food details. Returns (cal, protein_g, carbs_g, fat_g)."""
    calories, protein, carbs, fat = 0.0, 0.0, 0.0, 0.0
    nutrients = food.get("foodNutrients") or []
    for n in nutrients:
        nut = n.get("nutrient") or n
        nid = nut.get("id") or nut.get("nutrientId")
        amount = n.get("amount") if "amount" in n else n.get("value")
        if amount is None:
            continue
        try:
            val = float(amount)
        except (TypeError, ValueError):
            continue
        if nid == NUTRIENT_ENERGY_KCAL:
            calories = val
        elif nid == NUTRIENT_PROTEIN:
            protein = val
        elif nid == NUTRIENT_FAT:
            fat = val
        elif nid == NUTRIENT_CARBS:
            carbs = val
    return (calories, protein, carbs, fat)


def harvest_category(session, api_key: str, category: str) -> int:
    """Search for category, fetch details for up to 50 foods, save to DB. Returns count saved."""
    foods = search_foods(api_key, category, page_size=50)
    if not foods:
        return 0
    saved = 0
    for i, item in enumerate(foods[:50]):
        fdc_id = item.get("fdcId")
        if not fdc_id:
            continue
        name = item.get("description") or item.get("name") or ""
        if not name:
            continue
        time.sleep(0.2)
        details = get_food_details(api_key, fdc_id)
        if not details:
            continue
        cal, protein, carbs, fat = extract_nutrients(details)
        simplified = simplify_name(name)
        if not simplified:
            simplified = name.lower()[:255]
        existing = session.query(Ingredient).filter(Ingredient.fdc_id == fdc_id).first()
        if existing:
            existing.name = name[:500]
            existing.simplified_name = simplified[:255]
            existing.category = category
            existing.calories_per_100g = cal
            existing.protein_g = protein
            existing.carbs_g = carbs
            existing.fat_g = fat
        else:
            session.add(
                Ingredient(
                    fdc_id=fdc_id,
                    name=name[:500],
                    simplified_name=simplified[:255],
                    category=category,
                    calories_per_100g=cal,
                    protein_g=protein,
                    carbs_g=carbs,
                    fat_g=fat,
                    typical_unit="grams",
                    grams_per_unit=1.0,
                )
            )
        saved += 1
    return saved


def main():
    api_key = _get_usda_api_key()
    if not api_key:
        print("USDA_API_KEY is not set.")
        print("  - Add USDA_API_KEY=your_key to the .env file in the project root (same folder as docker-compose.yml).")
        print("  - Then run: docker-compose up -d")
        print("  - Then run: docker-compose exec backend python scripts/usda_harvester.py")
        sys.exit(1)
    # Recreate ingredients table so it matches current model (fdc_id, simplified_name, protein_g, etc.)
    Ingredient.__table__.drop(engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    total = 0
    try:
        for cat in CATEGORIES:
            print(f"Harvesting: {cat} ...")
            n = harvest_category(db, api_key, cat)
            total += n
            db.commit()
            print(f"  -> {n} foods")
        print(f"Done. Total saved: {total}")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
