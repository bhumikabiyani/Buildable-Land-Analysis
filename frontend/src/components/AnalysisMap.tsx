import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { PenTool } from 'lucide-react';
import { formatAcres } from '../utils/derivedMetrics';
import { ExclusionPolygon } from '../types/exclusion';

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------
type GeoJsonFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

const MANUAL_EXCLUSION_LAYER = 'manual-exclusions';
const MANUAL_EXCLUSION_FILL = '#ef4444';
const MANUAL_EXCLUSION_OPACITY = 0.7;
const MANUAL_EXCLUSION_OUTLINE = '#ffffff';

interface AnalysisMapProps {
  /** GeoJSON for the full parcel boundary – rendered in blue */
  parcelGeoJson: GeoJsonFeatureCollection;
  /** GeoJSON for the excluded (wetland + buffer) area – rendered in red */
  excludedGeoJson: GeoJsonFeatureCollection;
  /** GeoJSON for the buildable area – rendered in green */
  buildableGeoJson: GeoJsonFeatureCollection;
  excludedArea?: number;
  buildableArea?: number;
  /** User-drawn exclusion polygons from useExclusionPolygons */
  exclusions?: ExclusionPolygon[];
  /** Called when the user finishes drawing a polygon */
  onExclusionDrawn?: (feature: ExclusionPolygon) => void;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function createDrawControl(): MapboxDraw {
  return new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: false,
      line_string: false,
      point: false,
      trash: false,
      combine_features: false,
      uncombine_features: false,
    },
    defaultMode: 'simple_select',
    styles: [
      {
        id: 'gl-draw-polygon-fill',
        type: 'fill',
        filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        paint: {
          'fill-color': MANUAL_EXCLUSION_FILL,
          'fill-outline-color': MANUAL_EXCLUSION_OUTLINE,
          'fill-opacity': 0.25,
        },
      },
      {
        id: 'gl-draw-polygon-fill-static',
        type: 'fill',
        filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
        paint: {
          'fill-color': MANUAL_EXCLUSION_FILL,
          'fill-opacity': 0,
        },
      },
      {
        id: 'gl-draw-polygon-stroke-active',
        type: 'line',
        filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': MANUAL_EXCLUSION_OUTLINE,
          'line-width': 2,
        },
      },
      {
        id: 'gl-draw-polygon-stroke-static',
        type: 'line',
        filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': MANUAL_EXCLUSION_OUTLINE,
          'line-width': 0,
        },
      },
      {
        id: 'gl-draw-polygon-and-line-vertex-active',
        type: 'circle',
        filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
        paint: {
          'circle-radius': 5,
          'circle-color': MANUAL_EXCLUSION_OUTLINE,
        },
      },
      {
        id: 'gl-draw-polygon-and-line-vertex-inactive',
        type: 'circle',
        filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
        paint: {
          'circle-radius': 4,
          'circle-color': MANUAL_EXCLUSION_FILL,
        },
      },
    ],
  });
}

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
  if (map.getSource(id)) {
    (map.getSource(id) as maplibregl.GeoJSONSource).setData(data);
  } else {
    map.addSource(id, { type: 'geojson', data });
  }

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

function toExclusionCollection(exclusions: ExclusionPolygon[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return { type: 'FeatureCollection', features: exclusions };
}

function toExclusionPolygon(feature: GeoJSON.Feature): ExclusionPolygon | null {
  if (feature.geometry?.type !== 'Polygon') return null;
  return {
    type: 'Feature',
    properties: feature.properties ?? {},
    geometry: feature.geometry,
  };
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
  exclusions = [],
  onExclusionDrawn,
}: AnalysisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onExclusionDrawnRef = useRef(onExclusionDrawn);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    onExclusionDrawnRef.current = onExclusionDrawn;
  }, [onExclusionDrawn]);

  const startDrawExclusion = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.changeMode('draw_polygon');
    setIsDrawing(true);
  }, []);

  // ── Initialize map once on mount ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [0, 20],
      zoom: 2,
      attributionControl: false,
    });

    const draw = createDrawControl();
    drawRef.current = draw;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(draw as unknown as maplibregl.IControl);

    const handleDrawCreate = (event: { features: GeoJSON.Feature[] }) => {
      const polygon = toExclusionPolygon(event.features[0]);
      if (!polygon) return;

      console.log(polygon);
      onExclusionDrawnRef.current?.(polygon);

      const featureId = event.features[0].id;
      if (featureId !== undefined && featureId !== null) {
        draw.delete(String(featureId));
      }

      draw.changeMode('simple_select');
      setIsDrawing(false);
    };

    const handleModeChange = (event: { mode: string }) => {
      setIsDrawing(event.mode === 'draw_polygon');
    };

    map.on('draw.create', handleDrawCreate);
    map.on('draw.modechange', handleModeChange);

    mapRef.current = map;

    map.on('load', () => {
      upsertLayer(map, 'parcel', parcelGeoJson, '#3b82f6', 0.0, '#3b82f6', 3);
      upsertLayer(map, 'buildable', buildableGeoJson, '#22c55e', 0.4, '#16a34a', 1.5);
      upsertLayer(map, 'excluded', excludedGeoJson, '#ef4444', 0.6, '#dc2626', 1.5);
      upsertLayer(
        map,
        MANUAL_EXCLUSION_LAYER,
        toExclusionCollection(exclusions),
        MANUAL_EXCLUSION_FILL,
        MANUAL_EXCLUSION_OPACITY,
        MANUAL_EXCLUSION_OUTLINE,
        2,
      );

      const bounds = computeBounds(parcelGeoJson, excludedGeoJson, buildableGeoJson);
      if (bounds) {
        map.fitBounds(bounds, { padding: 60, duration: 800 });
      }
    });

    return () => {
      map.off('draw.create', handleDrawCreate);
      map.off('draw.modechange', handleModeChange);
      map.removeControl(draw as unknown as maplibregl.IControl);
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update layers when GeoJSON props change ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    upsertLayer(map, 'parcel', parcelGeoJson, '#3b82f6', 0.0, '#3b82f6', 3);
    upsertLayer(map, 'buildable', buildableGeoJson, '#22c55e', 0.4, '#16a34a', 1.5);
    upsertLayer(map, 'excluded', excludedGeoJson, '#ef4444', 0.6, '#dc2626', 1.5);

    const bounds = computeBounds(parcelGeoJson, excludedGeoJson, buildableGeoJson);
    if (bounds) {
      map.fitBounds(bounds, { padding: 60, duration: 600 });
    }
  }, [parcelGeoJson, excludedGeoJson, buildableGeoJson]);

  // ── Update manual exclusion layer from React state ────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    upsertLayer(
      map,
      MANUAL_EXCLUSION_LAYER,
      toExclusionCollection(exclusions),
      MANUAL_EXCLUSION_FILL,
      MANUAL_EXCLUSION_OPACITY,
      MANUAL_EXCLUSION_OUTLINE,
      2,
    );
  }, [exclusions]);

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

      {/* Draw Exclusion control */}
      <button
        type="button"
        onClick={startDrawExclusion}
        className={isDrawing ? 'btn-draw-exclusion btn-draw-exclusion--active' : 'btn-draw-exclusion'}
        title="Draw a polygon exclusion on the map"
      >
        <PenTool size={16} />
        {isDrawing ? 'Drawing…' : 'Draw Exclusion'}
      </button>

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
        {exclusions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
            <div style={{ width: 14, height: 14, border: '1.5px solid #ffffff', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.7)' }} />
            <span>Manual Exclusion ({exclusions.length})</span>
          </div>
        )}
      </div>
    </div>
  );
}
