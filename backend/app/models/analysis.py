from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, List, Optional
from shapely.geometry import shape

class AnalysisRequest(BaseModel):
    parcel_geojson: Dict[str, Any] = Field(
        ...,
        description="GeoJSON representing the property parcel boundaries."
    )
    wetlands_geojson: Dict[str, Any] = Field(
        ...,
        description="GeoJSON representing protected wetlands within or near the parcel."
    )
    setback_distance: float = Field(
        ...,
        description="Buffer setback distance around wetlands in meters.",
        ge=0.0
    )
    manual_exclusions: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional list of GeoJSON Feature polygons manually excluded by the user."
    )
    manual_restore_areas: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional list of GeoJSON Polygon geometries manually restored by the user."
    )

    @field_validator("parcel_geojson", "wetlands_geojson")
    @classmethod
    def validate_geojson_structure(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates that the input dictionary is a valid GeoJSON format.
        """
        if not isinstance(value, dict):
            raise ValueError("GeoJSON must be a JSON object (dictionary).")
            
        allowed_types = {"FeatureCollection", "Feature", "Polygon", "MultiPolygon"}
        geojson_type = value.get("type")
        
        if not geojson_type:
            raise ValueError("GeoJSON object is missing 'type' member.")
        if geojson_type not in allowed_types:
            raise ValueError(f"Unsupported GeoJSON type '{geojson_type}'. Supported types: {allowed_types}")
            
        return value

    @staticmethod
    def validate_polygon_geometry(geometry: Dict[str, Any], label: str) -> None:
        if not isinstance(geometry, dict):
            raise ValueError(f"Each {label} must include a geometry object.")

        geometry_type = geometry.get("type")
        if geometry_type not in {"Polygon", "MultiPolygon"}:
            raise ValueError(f"{label.capitalize()} geometries must be Polygon or MultiPolygon.")

        coordinates = geometry.get("coordinates")
        if not coordinates:
            raise ValueError(f"{label.capitalize()} geometry must include coordinates.")

        try:
            parsed_geometry = shape(geometry)
        except Exception as err:
            raise ValueError(f"{label.capitalize()} geometry is not valid GeoJSON: {err}")

        if parsed_geometry.is_empty:
            raise ValueError(f"{label.capitalize()} geometry cannot be empty.")
        if parsed_geometry.geom_type not in {"Polygon", "MultiPolygon"}:
            raise ValueError(f"{label.capitalize()} geometries must be Polygon or MultiPolygon.")
        if not parsed_geometry.is_valid:
            raise ValueError(f"{label.capitalize()} polygon geometry is invalid.")

    @field_validator("manual_exclusions")
    @classmethod
    def validate_manual_exclusions(cls, value: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        """
        Validates manually drawn exclusions as GeoJSON polygon Features.
        """
        if value is None:
            return value

        for feature in value:
            if not isinstance(feature, dict):
                raise ValueError("Each manual exclusion must be a GeoJSON Feature object.")
            if feature.get("type") != "Feature":
                raise ValueError("Each manual exclusion must have type 'Feature'.")

            geometry = feature.get("geometry")
            cls.validate_polygon_geometry(geometry, "manual exclusion")

        return value

    @field_validator("manual_restore_areas")
    @classmethod
    def validate_manual_restore_areas(cls, value: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        """
        Validates manually drawn restore areas as GeoJSON polygon geometries.
        """
        if value is None:
            return value

        for geometry in value:
            cls.validate_polygon_geometry(geometry, "manual restore area")

        return value

    model_config = {
        "json_schema_extra": {
            "example": {
                "parcel_geojson": {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [
                                    [
                                        [-122.401, 37.781],
                                        [-122.401, 37.789],
                                        [-122.391, 37.789],
                                        [-122.391, 37.781],
                                        [-122.401, 37.781]
                                    ]
                                ]
                            }
                        }
                    ]
                },
                "wetlands_geojson": {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [
                                    [
                                        [-122.398, 37.783],
                                        [-122.398, 37.785],
                                        [-122.395, 37.785],
                                        [-122.395, 37.783],
                                        [-122.398, 37.783]
                                    ]
                                ]
                            }
                        }
                    ]
                },
                "setback_distance": 50.0,
                "manual_exclusions": [],
                "manual_restore_areas": []
            }
        }
    }

class AnalysisResponse(BaseModel):
    parcel_area_acres: float = Field(
        ..., 
        description="Total area of the parcel in acres."
    )
    wetland_area_acres: float = Field(
        ..., 
        description="Total area of wetlands inside the parcel boundary in acres."
    )
    wetland_buffer_area_acres: float = Field(
        ..., 
        description="Acreage of the additional setback buffer zone (excluding original wetland area) inside the parcel."
    )
    excluded_area_acres: float = Field(
        ..., 
        description="Total excluded area (wetlands + setback buffer zones) in acres."
    )
    buildable_area_acres: float = Field(
        ..., 
        description="Remaining buildable land area in acres."
    )
    buildable_geojson: Dict[str, Any] = Field(
        ..., 
        description="GeoJSON FeatureCollection representing the buildable region."
    )
    excluded_geojson: Dict[str, Any] = Field(
        ..., 
        description="GeoJSON FeatureCollection representing the full unbuildable setback and wetland region."
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "parcel_area_acres": 247.11,
                "wetland_area_acres": 9.88,
                "wetland_buffer_area_acres": 11.83,
                "excluded_area_acres": 21.71,
                "buildable_area_acres": 225.40,
                "buildable_geojson": {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [
                                    [
                                        [-122.401, 37.781],
                                        [-122.401, 37.789],
                                        [-122.391, 37.789],
                                        [-122.391, 37.781],
                                        [-122.401, 37.781]
                                    ]
                                ]
                            }
                        }
                    ]
                },
                "excluded_geojson": {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [
                                    [
                                        [-122.398, 37.783],
                                        [-122.398, 37.785],
                                        [-122.395, 37.785],
                                        [-122.395, 37.783],
                                        [-122.398, 37.783]
                                    ]
                                ]
                            }
                        }
                    ]
                }
            }
        }
    }
