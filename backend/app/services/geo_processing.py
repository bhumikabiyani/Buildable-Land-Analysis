import json
import geopandas as gpd
from shapely.geometry import shape

def analyze_buildability(
    parcel_geojson: dict, 
    wetlands_geojson: dict, 
    buffer_distance_meters: float = 50.0
) -> dict:
    """
    Performs buildable land suitability analysis on input GeoJSON data.
    
    1. Loads parcel and wetlands GeoJSONs.
    2. Converts them into GeoDataFrames.
    3. Projects layers to a meter-based projection (EPSG:3857) to perform metric buffers.
    4. Computes buffer zone around wetlands.
    5. Computes buildable land by subtracting the buffered wetlands from the parcel.
    6. Converts the result back to standard geographic projection (WGS84 / EPSG:4326) 
       and returns as a GeoJSON dictionary.
    """
    # Step 1 & 2: Load input GeoJSON features directly into GeoDataFrames.
    # We specify the initial Coordinate Reference System (CRS) as WGS84 (EPSG:4326), 
    # which is standard for GeoJSON.
    parcel_gdf = gpd.GeoDataFrame.from_features(parcel_geojson.get("features", []), crs="EPSG:4326")
    wetlands_gdf = gpd.GeoDataFrame.from_features(wetlands_geojson.get("features", []), crs="EPSG:4326")
    
    # Validate that we have parcel inputs to perform analysis on
    if parcel_gdf.empty:
        raise ValueError("Parcel GeoJSON does not contain any valid features.")
        
    # Step 3: Reproject from standard geographic WGS84 (EPSG:4326) to 
    # a projected coordinate system (EPSG:3857 / Web Mercator) that uses meters.
    # This is critical so the buffer_distance_meters maps accurately to real-world meters.
    parcel_projected = parcel_gdf.to_crs(epsg=3857)
    
    if not wetlands_gdf.empty:
        wetlands_projected = wetlands_gdf.to_crs(epsg=3857)
        
        # Step 4: Perform buffer operation around the wetlands (in meters)
        # buffer() creates a new polygon boundary expanded outwards by the given distance.
        # We use `.unary_union` to dissolve overlapping wetlands buffers into a single geometry.
        buffered_wetlands = wetlands_projected.geometry.buffer(buffer_distance_meters).unary_union
        
        # Step 5: Perform Difference overlay operation.
        # Subtract the buffered wetland geometry from the parcel geometry.
        buildable_geometry = parcel_projected.geometry.difference(buffered_wetlands)
    else:
        # If there are no wetlands, the entire parcel remains buildable.
        buildable_geometry = parcel_projected.geometry

    # Wrap the resulting geometry into a GeoDataFrame maintaining the projection
    buildable_gdf = gpd.GeoDataFrame(geometry=buildable_geometry, crs="EPSG:3857")

    # Step 6: Convert the resulting projected GeoDataFrame back to geographic EPSG:4326 (WGS84)
    # so standard web-mapping client libraries (like MapLibre) can parse and display it.
    buildable_wgs84 = buildable_gdf.to_crs(epsg=4326)
    
    # Export to a Python dictionary representing GeoJSON structure
    return json.loads(buildable_wgs84.to_json())
