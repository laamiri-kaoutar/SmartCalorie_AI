from contextlib import asynccontextmanager

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from core.config import settings
from db.session import Base, engine
import models.user  
import models.ingredient 
import models.workout 
import models.plan 
from api.auth import router as auth_router
from api.predict import router as predict_router
from api.recommend import router as recommend_router
from api.users import router as users_router
from api.admin import router as admin_router
from services.prediction_service import PredictionService


Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    PredictionService()
    yield


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(predict_router, prefix="/api/v1/predict")
app.include_router(recommend_router, prefix="/api/v1/recommend")
app.include_router(users_router, prefix="/api/v1/users")
app.include_router(admin_router, prefix="/api/v1/admin")


@app.get("/")
def root():
    return {"project_name": settings.PROJECT_NAME}
