from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_land_parcels():
    # Placeholder for land queries
    return {"parcels": []}
