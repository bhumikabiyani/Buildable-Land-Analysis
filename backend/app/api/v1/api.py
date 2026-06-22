from fastapi import APIRouter

from backend.app.api.v1.endpoints import land

api_router = APIRouter()
api_router.include_router(land.router, prefix="/land", tags=["land"])

