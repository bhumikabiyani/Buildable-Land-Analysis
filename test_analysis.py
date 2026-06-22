import geopandas as gpd
from shapely.geometry import box

def run_suitability_analysis():
    # -------------------------------------------------------------
    # 1. Define the Coordinate Reference System (CRS)
    # -------------------------------------------------------------
    # We will use EPSG:3857 (Web Mercator) or a generic local UTM projection.
    # Since our inputs are defined in meters, a projected CRS allows accurate meter-based operations.
    crs = "EPSG:3857"

    # -------------------------------------------------------------
    # 2. Create the Sample Parcel Polygon
    # -------------------------------------------------------------
    # Defining a 1000m x 1000m square starting from coordinate (0, 0) to (1000, 1000).
    # box(minx, miny, maxx, maxy) creates a rectangular polygon.
    parcel_geom = box(0, 0, 1000, 1000)
    
    # Wrap in a GeoDataFrame for GeoPandas capabilities
    parcel_gdf = gpd.GeoDataFrame(geometry=[parcel_geom], crs=crs)
    
    # -------------------------------------------------------------
    # 3. Create the Sample Wetland Polygon
    # -------------------------------------------------------------
    # Defining a 200m x 200m square inside the parcel, e.g., from (400, 400) to (600, 600).
    wetland_geom = box(400, 400, 600, 600)
    
    # Wrap in a GeoDataFrame
    wetland_gdf = gpd.GeoDataFrame(geometry=[wetland_geom], crs=crs)

    # -------------------------------------------------------------
    # 4. Calculate Areas of Initial Features
    # -------------------------------------------------------------
    # We use .item() to extract the scalar float value from the GeoSeries
    parcel_area = parcel_gdf.geometry.area.item()
    wetland_area = wetland_gdf.geometry.area.item()

    # -------------------------------------------------------------
    # 5. Create a 50 Meter Buffer Around Wetlands
    # -------------------------------------------------------------
    # GIS Buffer operation: Creates a zone extending 50 meters outwards from the boundary of the wetland geometry.
    # Using GeoSeries.buffer(distance) creates a new geometry representing the buffer area.
    buffered_wetland_geom = wetland_gdf.geometry.buffer(50).item()
    buffered_wetland_gdf = gpd.GeoDataFrame(geometry=[buffered_wetland_geom], crs=crs)
    
    # Calculate the area of the buffered wetland
    buffer_area = buffered_wetland_gdf.geometry.area.item()

    # -------------------------------------------------------------
    # 6. Calculate Buildable Area (Subtract Buffered Wetland from Parcel)
    # -------------------------------------------------------------
    # GIS Overlay Difference operation: Computes the spatial difference between the parcel and the buffered wetland.
    # What remains inside the parcel boundary is the buildable land.
    buildable_geom = parcel_geom.difference(buffered_wetland_geom)
    buildable_gdf = gpd.GeoDataFrame(geometry=[buildable_geom], crs=crs)
    
    # Calculate the final buildable area
    buildable_area = buildable_gdf.geometry.area.item()

    # -------------------------------------------------------------
    # 7. Convert and Print Results in Acres
    # -------------------------------------------------------------
    # 1 square meter = 0.000247105 acres
    SQ_M_TO_ACRES = 0.000247105
    
    print(f"Parcel Area: {parcel_area * SQ_M_TO_ACRES:.2f} acres")
    print(f"Wetland Area: {wetland_area * SQ_M_TO_ACRES:.2f} acres")
    print(f"Buffer Area: {buffer_area * SQ_M_TO_ACRES:.2f} acres")
    print(f"Buildable Area: {buildable_area * SQ_M_TO_ACRES:.2f} acres")
    # -------------------------------------------------------------
    # 8. Plot and Save Results using Matplotlib
    # -------------------------------------------------------------
    # pyrefly: ignore [missing-import]
    import matplotlib.pyplot as plt
    # pyrefly: ignore [missing-import]
    from matplotlib.patches import Patch

    # Create figure and axis
    fig, ax = plt.subplots(figsize=(10, 10))

    # Plot layers
    # 1. Parcel boundary (outlined in blue)
    parcel_gdf.plot(ax=ax, facecolor='none', edgecolor='blue', linewidth=3, zorder=1)
    
    # 2. Buildable area (shaded in green)
    buildable_gdf.plot(ax=ax, facecolor='green', alpha=0.5, zorder=2)
    
    # 3. Buffered wetland (shaded in orange)
    buffered_wetland_gdf.plot(ax=ax, facecolor='orange', alpha=0.4, zorder=3)
    
    # 4. Original wetland (shaded in red)
    wetland_gdf.plot(ax=ax, facecolor='red', alpha=0.8, zorder=4)

    # Configure axes limits and grid
    ax.set_xlim(-100, 1100)
    ax.set_ylim(-100, 1100)
    ax.set_title("Buildable Land Suitability Analysis", fontsize=16, fontweight='bold', pad=15)
    ax.set_xlabel("Easting (meters)", fontsize=12)
    ax.set_ylabel("Northing (meters)", fontsize=12)
    ax.grid(True, linestyle='--', alpha=0.5)

    # Custom Legend representation for the layers with acreage calculations
    legend_elements = [
        Patch(edgecolor='blue', facecolor='none', linewidth=2, label=f'Parcel Boundary ({parcel_area * SQ_M_TO_ACRES:.2f} acres)'),
        Patch(facecolor='green', alpha=0.5, label=f'Buildable Area ({buildable_area * SQ_M_TO_ACRES:.2f} acres)'),
        Patch(facecolor='orange', alpha=0.4, label=f'Wetland Buffer 50m ({buffer_area * SQ_M_TO_ACRES:.2f} acres)'),
        Patch(facecolor='red', alpha=0.8, label=f'Wetland ({wetland_area * SQ_M_TO_ACRES:.2f} acres)'),
    ]
    ax.legend(handles=legend_elements, loc='upper right', fontsize=11, framealpha=0.9)

    # Export map plot to PNG
    plt.tight_layout()
    plt.savefig("analysis_result.png", dpi=300)
    print("Plot saved successfully as 'analysis_result.png'.")


if __name__ == "__main__":
    run_suitability_analysis()

