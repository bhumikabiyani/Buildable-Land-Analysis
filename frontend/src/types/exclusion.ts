/** A user-drawn exclusion polygon stored as a GeoJSON Feature. */
export type ExclusionPolygon = GeoJSON.Feature<GeoJSON.Polygon>;

export type ExclusionFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon>;

/** A user-drawn restore polygon stored as a GeoJSON Feature. */
export type RestorePolygon = GeoJSON.Feature<GeoJSON.Polygon>;

export type RestoreFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon>;
