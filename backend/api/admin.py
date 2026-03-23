from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.deps import get_current_admin
from db.session import get_db
from models.user import User
from services.admin_service import AdminService


router = APIRouter(tags=["admin"])


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    return AdminService(db)


@router.get("/users")
def list_users(
    admin: User = Depends(get_current_admin),
    admin_service: AdminService = Depends(get_admin_service),
):
    return admin_service.list_users()


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    admin_service: AdminService = Depends(get_admin_service),
):
    ok = admin_service.delete_user(user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"deleted": True}


@router.get("/stats")
def stats(
    admin: User = Depends(get_current_admin),
    admin_service: AdminService = Depends(get_admin_service),
):
    return admin_service.get_stats()


@router.get("/ingredients")
def search_ingredients(
    q: str = Query("", min_length=1),
    admin: User = Depends(get_current_admin),
    admin_service: AdminService = Depends(get_admin_service),
):
    results = admin_service.search_ingredients(q)
    return [
        {
            "id": r.id,
            "fdc_id": r.fdc_id,
            "name": r.name,
            "simplified_name": r.simplified_name,
            "category": r.category,
            "calories_per_100g": r.calories_per_100g,
            "protein_g": r.protein_g,
            "carbs_g": r.carbs_g,
            "fat_g": r.fat_g,
        }
        for r in results
    ]


@router.post("/ingredients/harvest")
def harvest_ingredients(
    category: str = Query(..., min_length=1),
    admin: User = Depends(get_current_admin),
    admin_service: AdminService = Depends(get_admin_service),
):
    return admin_service.harvest_ingredients(category)

