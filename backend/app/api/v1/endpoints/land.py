from fastapi import APIRouter, HTTPException
import geopandas as gpd
from app.services.land_analysis import LandAnalyzer
from app.models.analysis import AnalysisRequest, AnalysisResponse

router = APIRouter()
analyzer = LandAnalyzer()


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_land(request: AnalysisRequest):
    """
    Analyzes a parcel for buildable land area suitability by excluding setback buffers around wetlands.
    """
    try:
        # 1. Parse Parcel GeoJSON into GeoDataFrame
        parcel_features = request.parcel_geojson.get("features", [])
        if not parcel_features:
            # Fallback if request contains raw single Feature instead of FeatureCollection
            if request.parcel_geojson.get("type") == "Feature":
                parcel_features = [request.parcel_geojson]
            else:
                raise HTTPException(status_code=400, detail="Invalid parcel GeoJSON format. Must contain features list.")
                
        parcel_gdf = gpd.GeoDataFrame.from_features(parcel_features, crs="EPSG:4326")
        
        # 2. Parse Wetlands GeoJSON into GeoDataFrame
        wetlands_features = request.wetlands_geojson.get("features", [])
        if not wetlands_features and request.wetlands_geojson.get("type") == "Feature":
            wetlands_features = [request.wetlands_geojson]
            
        wetlands_gdf = gpd.GeoDataFrame.from_features(wetlands_features, crs="EPSG:4326")
        
        # 3. Call LandAnalyzer service
        result = analyzer.calculate_buildable_area(
            parcel_gdf=parcel_gdf,
            wetlands_gdf=wetlands_gdf,
            setback_distance=request.setback_distance
        )
        
        return result
        
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to perform spatial land analysis: {str(err)}")
