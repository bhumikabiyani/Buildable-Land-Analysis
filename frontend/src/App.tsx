import { useState, useEffect } from 'react';
import { Map as MapIcon, Info, Navigation } from 'lucide-react';
import AnalysisMap from './components/AnalysisMap';
import AnalysisSummary from './components/AnalysisSummary';
import SetbackControl from './components/SetbackControl';
import AnalysisMetadataCard from './components/AnalysisMetadataCard';
import { MapLoadingSkeleton, SidebarLoadingSkeleton } from './components/AnalysisLoadingSkeleton';
import { analyzeLand, AnalysisResponse } from './api/client';

// Sample geometry data
const SAMPLE_PARCEL = {
  type: "FeatureCollection" as const,
  features: [{
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [-97.75, 30.25],
        [-97.74, 30.25],
        [-97.74, 30.26],
        [-97.75, 30.26],
        [-97.75, 30.25]
      ]]
    }
  }]
};

const SAMPLE_WETLANDS = {
  type: "FeatureCollection" as const,
  features: [{
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [-97.747, 30.253],
        [-97.746, 30.253],
        [-97.746, 30.254],
        [-97.747, 30.254],
        [-97.747, 30.253]
      ]]
    }
  }]
};


export default function App() {
  const [setback, setSetback] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [setbackUsed, setSetbackUsed] = useState<number>(50);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const data = await analyzeLand({
        parcel_geojson: SAMPLE_PARCEL,
        wetlands_geojson: SAMPLE_WETLANDS,
        setback_distance: setback
      });
      const endTime = performance.now();
      setResult(data);
      setDurationMs(Math.round(endTime - startTime));
      setLastCompleted(new Date().toLocaleTimeString());
      setSetbackUsed(setback);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Run analysis on initial page load
  useEffect(() => {
    runAnalysis();
  }, []);


  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#0b0f19' }}>
      
      {/* Sidebar Panel */}
      <div className="glass-panel" style={{ width: '400px', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
            <MapIcon size={24} className="text-blue-400" color="#3b82f6" />
            Buildable Land
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Geospatial suitability analyzer
          </p>
        </div>

        {/* Controls */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <SetbackControl 
            value={setback}
            onChange={setSetback}
            onAnalyze={runAnalysis}
            loading={loading}
          />

          {error && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <SidebarLoadingSkeleton />
        ) : result ? (
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1rem', fontWeight: 600 }}>Analysis Results</h3>
            <AnalysisSummary result={result} />
            <AnalysisMetadataCard 
              lastCompleted={lastCompleted}
              setbackUsed={setbackUsed}
              durationMs={durationMs}
              parcelArea={result.parcel_area_acres}
            />
          </div>
        ) : null}

      </div>

      {/* Main Map Area */}
      <div style={{ flex: 1, position: 'relative', background: '#0b0f19' }}>
        {loading ? (
          <MapLoadingSkeleton />
        ) : result ? (
          <AnalysisMap 
            parcelGeoJson={SAMPLE_PARCEL}
            excludedGeoJson={result.excluded_geojson}
            buildableGeoJson={result.buildable_geojson}
            excludedArea={result.excluded_area_acres}
            buildableArea={result.buildable_area_acres}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: '#475569' }}>
            <Navigation size={48} strokeWidth={1} />
            <p style={{ fontSize: '1.125rem' }}>Run analysis to visualize results</p>
          </div>
        )}
      </div>

    </div>
  );
}
