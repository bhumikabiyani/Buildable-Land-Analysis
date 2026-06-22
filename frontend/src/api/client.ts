export interface AnalysisRequest {
  parcel_geojson: GeoJSON.FeatureCollection;
  wetlands_geojson: GeoJSON.FeatureCollection;
  setback_distance: number;
}

export interface AnalysisResponse {
  parcel_area_acres: number;
  wetland_area_acres: number;
  wetland_buffer_area_acres: number;
  excluded_area_acres: number;
  buildable_area_acres: number;
  buildable_geojson: GeoJSON.FeatureCollection;
  excluded_geojson: GeoJSON.FeatureCollection;
}

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

/**
 * Sends a land analysis request to the backend.
 * 
 * @param request The analysis request containing parcel, wetlands, and setback distance
 * @returns A promise resolving to the AnalysisResponse containing calculated areas and GeoJSONs
 */
export async function analyzeLand(request: AnalysisRequest): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : JSON.stringify(errorData.detail);
      }
    } catch (e) {
      // Ignore JSON parse errors for text/html error responses
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
