import json
from typing import Dict, Any
import geopandas as gpd
from shapely.geometry import Polygon

class LandAnalyzer:
    """
    A class to perform spatial analysis on land parcels and exclude protected areas.
    """

    def calculate_buildable_area(
        self,
        parcel_gdf: gpd.GeoDataFrame,
        wetlands_gdf: gpd.GeoDataFrame,
        setback_distance: float
    ) -> Dict[str, Any]:
        """
        Calculates buildable area by buffering wetlands, intersecting them with the parcel boundaries
        to compute the excluded area, and subtracting it from the total parcel area.

        Parameters:
        - parcel_gdf (gpd.GeoDataFrame): GeoDataFrame representing the parcel.
        - wetlands_gdf (gpd.GeoDataFrame): GeoDataFrame representing the wetlands.
        - setback_distance (float): Buffer distance in meters (or coordinates units).

        Returns:
        - Dict[str, Any]: Dictionary containing parcel area, excluded area, buildable area,
                          and the buildable region's GeoJSON structure.
        """
        # Determine if inputs are in geographic coordinates (e.g., standard GPS latitude/longitude)
        # to ensure spatial measurements (areas and buffers) are accurately calculated.
        is_geographic = parcel_gdf.crs is not None and parcel_gdf.crs.is_geographic

        # We use EPSG:5070 (NAD83 / Conus Albers) for projected calculations.
        # EPSG:3857 (Web Mercator) is a conformal projection that severely distorts area calculations
        # as latitude increases. EPSG:5070 is an equal-area projection designed for North America,
        # which preserves exact area measurements and regional distances.
        target_projected_crs = "EPSG:5070"

        if is_geographic:
            # Temporarily reproject to EPSG:5070 for area-preserving calculations
            working_parcel = parcel_gdf.to_crs(target_projected_crs)
            working_wetlands = wetlands_gdf.to_crs(target_projected_crs) if not wetlands_gdf.empty else wetlands_gdf
        else:
            # If already projected, still project to EPSG:5070 to ensure metric accuracy for CONUS region
            working_parcel = parcel_gdf.to_crs(target_projected_crs)
            working_wetlands = wetlands_gdf.to_crs(target_projected_crs) if not wetlands_gdf.empty else wetlands_gdf

        # Extract unified parcel shape and clean up geometry
        parcel_geometry = working_parcel.geometry.unary_union.buffer(0)
        parcel_area_sqm = parcel_geometry.area

        if not working_wetlands.empty:
            # Union wetlands geometries to handle overlapping features cleanly
            wetlands_geometry = working_wetlands.geometry.unary_union.buffer(0)

            # 1. Calculate actual wetland area inside parcel (intersect wetland with parcel) and clean up
            wetland_inside_parcel = parcel_geometry.intersection(wetlands_geometry).buffer(0)
            wetland_area_sqm = wetland_inside_parcel.area

            # 2. Buffer wetlands by the specified setback/buffer distance (in meters) and clean up
            buffered_wetlands = working_wetlands.geometry.buffer(setback_distance).unary_union.buffer(0)

            # 3. Calculate total excluded geometry (intersect full buffered wetlands with the parcel) and clean up
            excluded_geometry = parcel_geometry.intersection(buffered_wetlands).buffer(0)
            excluded_area_sqm = excluded_geometry.area

            # 4. Calculate additional buffer area ONLY (total excluded zone minus original wetland area inside parcel)
            # This represents the buffer setback zone excluding the wetland itself.
            additional_buffer_geometry = excluded_geometry.difference(wetland_inside_parcel).buffer(0)
            additional_buffer_area_sqm = additional_buffer_geometry.area

            # 5. Subtract excluded area from parcel to produce the buildable area geometry and clean up
            buildable_geometry = parcel_geometry.difference(excluded_geometry).buffer(0)
        else:
            # If no wetlands exist, all wetlands-related areas are zero
            wetland_area_sqm = 0.0
            additional_buffer_area_sqm = 0.0
            excluded_area_sqm = 0.0
            buildable_geometry = parcel_geometry.buffer(0)

        # Calculate final buildable area in square meters
        buildable_area_sqm = buildable_geometry.area

        # Prepare geometry GeoDataFrames for output conversion
        buildable_gdf = gpd.GeoDataFrame(geometry=[buildable_geometry], crs=target_projected_crs)
        excluded_gdf = gpd.GeoDataFrame(geometry=[excluded_geometry], crs=target_projected_crs)

        # Reproject outputs back to original coordinate system (or EPSG:4326) for MapLibre rendering
        if is_geographic:
            buildable_output = buildable_gdf.to_crs(parcel_gdf.crs)
            excluded_output = excluded_gdf.to_crs(parcel_gdf.crs)
        else:
            buildable_output = buildable_gdf.to_crs("EPSG:4326")
            excluded_output = excluded_gdf.to_crs("EPSG:4326")

        # Conversion: 1 square meter = 0.000247105 acres
        SQM_TO_ACRES = 0.000247105
        
        # Calculate final output values in acres
        parcel_area_acres = parcel_area_sqm * SQM_TO_ACRES
        excluded_area_acres = excluded_area_sqm * SQM_TO_ACRES
        buildable_area_acres = buildable_area_sqm * SQM_TO_ACRES

        # Load GeoJSON format for MapLibre rendering
        buildable_geojson = json.loads(buildable_output.to_json())
        excluded_geojson = json.loads(excluded_output.to_json())

        return {
            "parcel_area_acres": parcel_area_acres,
            "excluded_area_acres": excluded_area_acres,
            "buildable_area_acres": buildable_area_acres,
            "buildable_geojson": buildable_geojson,
            "excluded_geojson": excluded_geojson
        }

