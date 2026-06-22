from fastapi import APIRouter

from app.api.v1.endpoints import land

api_router = APIRouter()
api_router.include_router(land.router, tags=["land"])

