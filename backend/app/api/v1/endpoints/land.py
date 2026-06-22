from fastapi import APIRouter, HTTPException
import geopandas as gpd
from app.services.land_analysis import LandAnalyzer
from app.models.analysis import AnalysisRequest, AnalysisResponse

router = APIRouter()
analyzer = LandAnalyzer()


def features_to_gdf(features: list, crs: str = "EPSG:4326") -> gpd.GeoDataFrame:
    if not features:
        return gpd.GeoDataFrame(geometry=[], crs=crs)
    return gpd.GeoDataFrame.from_features(features, crs=crs)


def geometries_to_gdf(geometries: list, crs: str = "EPSG:4326") -> gpd.GeoDataFrame:
    if not geometries:
        return gpd.GeoDataFrame(geometry=[], crs=crs)
    features = [
        {"type": "Feature", "properties": {}, "geometry": geometry}
        for geometry in geometries
    ]
    return gpd.GeoDataFrame.from_features(features, crs=crs)


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
                
        parcel_gdf = features_to_gdf(parcel_features)
        
        # 2. Parse Wetlands GeoJSON into GeoDataFrame
        wetlands_features = request.wetlands_geojson.get("features", [])
        if not wetlands_features and request.wetlands_geojson.get("type") == "Feature":
            wetlands_features = [request.wetlands_geojson]
            
        wetlands_gdf = features_to_gdf(wetlands_features)
        manual_exclusions_gdf = features_to_gdf(request.manual_exclusions or [])
        manual_restore_areas_gdf = geometries_to_gdf(request.manual_restore_areas or [])
        
        # 3. Call LandAnalyzer service
        result = analyzer.calculate_buildable_area(
            parcel_gdf=parcel_gdf,
            wetlands_gdf=wetlands_gdf,
            setback_distance=request.setback_distance,
            manual_exclusions_gdf=manual_exclusions_gdf,
            manual_restore_areas_gdf=manual_restore_areas_gdf
        )
        
        return result
        
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to perform spatial land analysis: {str(err)}")
