import json
from typing import Dict, Any, Optional
import geopandas as gpd
from shapely.geometry import GeometryCollection

class LandAnalyzer:
    """
    A class to perform spatial analysis on land parcels and exclude protected areas.
    """

    def calculate_buildable_area(
        self,
        parcel_gdf: gpd.GeoDataFrame,
        wetlands_gdf: gpd.GeoDataFrame,
        setback_distance: float,
        manual_exclusions_gdf: Optional[gpd.GeoDataFrame] = None,
        manual_restore_areas_gdf: Optional[gpd.GeoDataFrame] = None
    ) -> Dict[str, Any]:
        """
        Calculates buildable area by buffering wetlands, intersecting them with the parcel boundaries
        to compute the excluded area, and subtracting it from the total parcel area.

        Parameters:
        - parcel_gdf (gpd.GeoDataFrame): GeoDataFrame representing the parcel.
        - wetlands_gdf (gpd.GeoDataFrame): GeoDataFrame representing the wetlands.
        - setback_distance (float): Buffer distance in meters (or coordinates units).
        - manual_exclusions_gdf (Optional[gpd.GeoDataFrame]): User-drawn exclusion polygons.
        - manual_restore_areas_gdf (Optional[gpd.GeoDataFrame]): User-drawn restore polygons.

        Returns:
        - Dict[str, Any]: Dictionary containing parcel area, excluded area, buildable area,
                          and the buildable region's GeoJSON structure.
        """
        from shapely import make_valid

        def repair_gdf_geometries(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
            if gdf.empty:
                return gdf
            repaired_geoms = []
            for geom in gdf.geometry:
                if geom is None or geom.is_empty:
                    continue
                if not geom.is_valid:
                    try:
                        # Attempt automatic geometry fix (e.g. self-intersections)
                        geom = make_valid(geom)
                    except Exception:
                        # If repair fails, fallback to buffer(0)
                        geom = geom.buffer(0)
                repaired_geoms.append(geom)
            
            if not repaired_geoms:
                return gpd.GeoDataFrame(geometry=[], crs=gdf.crs)
            return gpd.GeoDataFrame(geometry=repaired_geoms, crs=gdf.crs)

        # Pre-repair geometries of the inputs
        cleaned_parcel = repair_gdf_geometries(parcel_gdf)
        cleaned_wetlands = repair_gdf_geometries(wetlands_gdf)
        cleaned_manual_exclusions = repair_gdf_geometries(
            manual_exclusions_gdf
            if manual_exclusions_gdf is not None
            else gpd.GeoDataFrame(geometry=[], crs=parcel_gdf.crs)
        )
        cleaned_manual_restore_areas = repair_gdf_geometries(
            manual_restore_areas_gdf
            if manual_restore_areas_gdf is not None
            else gpd.GeoDataFrame(geometry=[], crs=parcel_gdf.crs)
        )

        if cleaned_parcel.empty:
            raise ValueError("Input parcel GeoJSON does not contain any valid geometries.")

        # Determine if inputs are in geographic coordinates (e.g., standard GPS latitude/longitude)
        # to ensure spatial measurements (areas and buffers) are accurately calculated.
        is_geographic = cleaned_parcel.crs is not None and cleaned_parcel.crs.is_geographic

        # We use EPSG:5070 (NAD83 / Conus Albers) for projected calculations.
        # EPSG:3857 (Web Mercator) is a conformal projection that severely distorts area calculations
        # as latitude increases. EPSG:5070 is an equal-area projection designed for North America,
        # which preserves exact area measurements and regional distances.
        target_projected_crs = "EPSG:5070"

        if is_geographic:
            # Temporarily reproject to EPSG:5070 for area-preserving calculations
            working_parcel = cleaned_parcel.to_crs(target_projected_crs)
            working_wetlands = cleaned_wetlands.to_crs(target_projected_crs) if not cleaned_wetlands.empty else cleaned_wetlands
            working_manual_exclusions = cleaned_manual_exclusions.to_crs(target_projected_crs) if not cleaned_manual_exclusions.empty else cleaned_manual_exclusions
            working_manual_restore_areas = cleaned_manual_restore_areas.to_crs(target_projected_crs) if not cleaned_manual_restore_areas.empty else cleaned_manual_restore_areas
        else:
            # If already projected, still project to EPSG:5070 to ensure metric accuracy for CONUS region
            working_parcel = cleaned_parcel.to_crs(target_projected_crs)
            working_wetlands = cleaned_wetlands.to_crs(target_projected_crs) if not cleaned_wetlands.empty else cleaned_wetlands
            working_manual_exclusions = cleaned_manual_exclusions.to_crs(target_projected_crs) if not cleaned_manual_exclusions.empty else cleaned_manual_exclusions
            working_manual_restore_areas = cleaned_manual_restore_areas.to_crs(target_projected_crs) if not cleaned_manual_restore_areas.empty else cleaned_manual_restore_areas

        # Extract unified parcel shape and clean up geometry
        parcel_geometry = working_parcel.geometry.unary_union.buffer(0)
        parcel_area_sqm = parcel_geometry.area
        excluded_geometry = GeometryCollection()
        wetland_excluded_geometry = GeometryCollection()
        wetland_inside_parcel = GeometryCollection()

        if not working_wetlands.empty:
            # Union wetlands geometries to handle overlapping features cleanly
            wetlands_geometry = working_wetlands.geometry.unary_union.buffer(0)

            # 1. Calculate actual wetland area inside parcel (intersect wetland with parcel) and clean up
            wetland_inside_parcel = parcel_geometry.intersection(wetlands_geometry).buffer(0)
            wetland_area_sqm = wetland_inside_parcel.area

            # 2. Buffer wetlands by the specified setback/buffer distance (in meters) and clean up
            buffered_wetlands = working_wetlands.geometry.buffer(setback_distance).unary_union.buffer(0)

            # 3. Calculate total excluded geometry (intersect full buffered wetlands with the parcel) and clean up
            wetland_excluded_geometry = parcel_geometry.intersection(buffered_wetlands).buffer(0)
            excluded_geometry = wetland_excluded_geometry
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
            buildable_geometry = parcel_geometry.buffer(0)

        if not working_manual_exclusions.empty:
            # User-drawn exclusions are clipped to the parcel before joining the excluded geometry.
            manual_exclusion_geometry = working_manual_exclusions.geometry.unary_union.buffer(0)
            manual_exclusion_inside_parcel = parcel_geometry.intersection(manual_exclusion_geometry).buffer(0)
            excluded_geometry = excluded_geometry.union(manual_exclusion_inside_parcel).buffer(0)

        buildable_geometry = parcel_geometry.difference(excluded_geometry).buffer(0)
        restored_geometry = GeometryCollection()

        if not working_manual_restore_areas.empty:
            # Restore areas only affect land currently excluded from buildability.
            restore_geometry = working_manual_restore_areas.geometry.unary_union.buffer(0)
            restored_geometry = excluded_geometry.intersection(restore_geometry).buffer(0)
            buildable_geometry = buildable_geometry.union(restored_geometry).buffer(0)
            excluded_geometry = excluded_geometry.difference(restored_geometry).buffer(0)

        excluded_area_sqm = excluded_geometry.area
        additional_buffer_geometry = (
            wetland_excluded_geometry
            .difference(restored_geometry)
            .difference(wetland_inside_parcel)
            .buffer(0)
        )
        additional_buffer_area_sqm = additional_buffer_geometry.area

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

        # Simplify output geometries to reduce GeoJSON response size.
        # Buffer operations produce many intermediate vertices (e.g., curved edges from circular buffers).
        # We apply Ramer-Douglas-Peucker simplification with preserve_topology=True so that:
        #  - Shared boundaries are not broken (topology is preserved)
        #  - Polygons remain valid closed rings
        #  - Visual fidelity is maintained at typical web map zoom levels
        # Tolerance of 0.00001° ≈ 1 meter at mid-latitudes — safe for property-scale mapping.
        SIMPLIFY_TOLERANCE = 0.00001

        def simplify_gdf(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
            gdf = gdf.copy()
            gdf["geometry"] = gdf["geometry"].simplify(
                tolerance=SIMPLIFY_TOLERANCE,
                preserve_topology=True
            )
            return gdf

        buildable_output = simplify_gdf(buildable_output)
        excluded_output = simplify_gdf(excluded_output)

        # Conversion: 1 square meter = 0.000247105 acres
        SQM_TO_ACRES = 0.000247105
        
        # Calculate final output values in acres
        parcel_area_acres = parcel_area_sqm * SQM_TO_ACRES
        wetland_area_acres = wetland_area_sqm * SQM_TO_ACRES
        wetland_buffer_area_acres = additional_buffer_area_sqm * SQM_TO_ACRES
        excluded_area_acres = excluded_area_sqm * SQM_TO_ACRES
        buildable_area_acres = buildable_area_sqm * SQM_TO_ACRES

        # Load GeoJSON format for MapLibre rendering
        buildable_geojson = json.loads(buildable_output.to_json())
        excluded_geojson = json.loads(excluded_output.to_json())

        return {
            "parcel_area_acres": parcel_area_acres,
            "wetland_area_acres": wetland_area_acres,
            "wetland_buffer_area_acres": wetland_buffer_area_acres,
            "excluded_area_acres": excluded_area_acres,
            "buildable_area_acres": buildable_area_acres,
            "buildable_geojson": buildable_geojson,
            "excluded_geojson": excluded_geojson
        }
