import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { formatAcres } from '../utils/derivedMetrics';

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------
type GeoJsonFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

interface AnalysisMapProps {
  /** GeoJSON for the full parcel boundary – rendered in blue */
  parcelGeoJson: GeoJsonFeatureCollection;
  /** GeoJSON for the excluded (wetland + buffer) area – rendered in red */
  excludedGeoJson: GeoJsonFeatureCollection;
  /** GeoJSON for the buildable area – rendered in green */
  buildableGeoJson: GeoJsonFeatureCollection;
  excludedArea?: number;
  buildableArea?: number;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Extract a flat list of [lng, lat] positions from any GeoJSON geometry. */
function extractCoordinates(fc: GeoJsonFeatureCollection): [number, number][] {
  const coords: [number, number][] = [];
  for (const feature of fc.features) {
    if (!feature.geometry) continue;
    const geom = feature.geometry as GeoJSON.Geometry;
    switch (geom.type) {
      case 'Polygon':
        geom.coordinates.flat(1).forEach(c => coords.push(c as [number, number]));
        break;
      case 'MultiPolygon':
        geom.coordinates.flat(2).forEach(c => coords.push(c as [number, number]));
        break;
      default:
        break;
    }
  }
  return coords;
}

/** Compute a LngLatBoundsLike that wraps all coordinates in the three layers. */
function computeBounds(
  parcel: GeoJsonFeatureCollection,
  excluded: GeoJsonFeatureCollection,
  buildable: GeoJsonFeatureCollection
): maplibregl.LngLatBoundsLike | null {
  const coords = [
    ...extractCoordinates(parcel),
    ...extractCoordinates(excluded),
    ...extractCoordinates(buildable),
  ];
  if (coords.length === 0) return null;

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

/** Add (or update) a GeoJSON source + fill + outline layer to the map. */
function upsertLayer(
  map: maplibregl.Map,
  id: string,
  data: GeoJsonFeatureCollection,
  fillColor: string,
  fillOpacity: number,
  outlineColor: string,
  lineWidth: number = 2
) {
  // Source
  if (map.getSource(id)) {
    (map.getSource(id) as maplibregl.GeoJSONSource).setData(data);
  } else {
    map.addSource(id, { type: 'geojson', data });
  }

  // Fill layer
  const fillId = `${id}-fill`;
  if (!map.getLayer(fillId)) {
    map.addLayer({
      id: fillId,
      type: 'fill',
      source: id,
      paint: {
        'fill-color': fillColor,
        'fill-opacity': fillOpacity,
      },
    });
  } else {
    map.setPaintProperty(fillId, 'fill-opacity', fillOpacity);
  }

  // Outline layer
  const outlineId = `${id}-outline`;
  if (!map.getLayer(outlineId)) {
    map.addLayer({
      id: outlineId,
      type: 'line',
      source: id,
      paint: {
        'line-color': outlineColor,
        'line-width': lineWidth,
      },
    });
  } else {
    map.setPaintProperty(outlineId, 'line-width', lineWidth);
  }
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function AnalysisMap({
  parcelGeoJson,
  excludedGeoJson,
  buildableGeoJson,
  excludedArea,
  buildableArea,
}: AnalysisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // ── Initialize map once on mount ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // Free OpenStreetMap-based style – no token required
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [0, 20],
      zoom: 2,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    mapRef.current = map;

    map.on('load', () => {
      // Order matters: parcel first (bottom), then buildable, then excluded (top)
      upsertLayer(map, 'parcel',   parcelGeoJson,   '#3b82f6', 0.0,  '#3b82f6', 3);
      upsertLayer(map, 'buildable', buildableGeoJson, '#22c55e', 0.4,  '#16a34a', 1.5);
      upsertLayer(map, 'excluded',  excludedGeoJson,  '#ef4444', 0.6,  '#dc2626', 1.5);

      // Fit map bounds to the data extent
      const bounds = computeBounds(parcelGeoJson, excludedGeoJson, buildableGeoJson);
      if (bounds) {
        map.fitBounds(bounds, { padding: 60, duration: 800 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update layers when GeoJSON props change (after first render) ─
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    upsertLayer(map, 'parcel',    parcelGeoJson,    '#3b82f6', 0.0,  '#3b82f6', 3);
    upsertLayer(map, 'buildable', buildableGeoJson, '#22c55e', 0.4,  '#16a34a', 1.5);
    upsertLayer(map, 'excluded',  excludedGeoJson,  '#ef4444', 0.6,  '#dc2626', 1.5);

    const bounds = computeBounds(parcelGeoJson, excludedGeoJson, buildableGeoJson);
    if (bounds) {
      map.fitBounds(bounds, { padding: 60, duration: 600 });
    }
  }, [parcelGeoJson, excludedGeoJson, buildableGeoJson]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      />
      
      {/* Floating Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        zIndex: 10,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.25rem' }}>
          Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
          <div style={{ width: 14, height: 14, border: '2.5px solid #3b82f6', borderRadius: '3px', background: 'transparent' }} />
          <span>Parcel Boundary</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
          <div style={{ width: 14, height: 14, border: '1px solid #dc2626', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.6)' }} />
          <span>Excluded Area{excludedArea !== undefined && ` (${formatAcres(excludedArea)})`}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
          <div style={{ width: 14, height: 14, border: '1px solid #16a34a', borderRadius: '3px', background: 'rgba(34, 197, 94, 0.4)' }} />
          <span>Buildable Area{buildableArea !== undefined && ` (${formatAcres(buildableArea)})`}</span>
        </div>
      </div>
    </div>
  );
}
