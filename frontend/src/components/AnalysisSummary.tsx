import { AnalysisResponse } from '../api/client';
import { buildablePercentage } from '../utils/derivedMetrics';

interface AnalysisSummaryProps {
  result: AnalysisResponse;
}

export default function AnalysisSummary({ result }: AnalysisSummaryProps) {
  const buildablePct = buildablePercentage(result.buildable_area_acres, result.parcel_area_acres);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      {/* Parcel Area */}
      <div className="metric-card">
        <span className="metric-label">
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} /> 
          Total Parcel
        </span>
        <span className="metric-value" style={{ color: '#60a5fa' }}>
          {result.parcel_area_acres.toFixed(2)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>acres</span>
        </span>
      </div>

      {/* Excluded Area */}
      <div className="metric-card">
        <span className="metric-label">
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /> 
          Excluded (Wetland + Buffer)
        </span>
        <span className="metric-value" style={{ color: '#f87171' }}>
          {result.excluded_area_acres.toFixed(2)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>acres</span>
        </span>
      </div>

      {/* Buildable Area */}
      <div className="metric-card" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
        <span className="metric-label" style={{ color: '#86efac' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} /> 
          Net Buildable Area
        </span>
        <span className="metric-value" style={{ color: '#4ade80' }}>
          {result.buildable_area_acres.toFixed(2)} <span style={{ fontSize: '0.875rem', color: 'rgba(74, 222, 128, 0.6)', fontWeight: 500 }}>acres</span>
        </span>
      </div>

      {/* Buildable Percentage */}
      <div className="metric-card" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
        <span className="metric-label" style={{ color: '#93c5fd' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} /> 
          Buildable Percentage
        </span>
        <span className="metric-value" style={{ color: '#60a5fa' }}>
          {buildablePct.toFixed(2)}%
        </span>
      </div>

      {/* Detailed Breakdown */}
      <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', fontSize: '0.75rem', color: '#64748b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Wetland Area:</span>
          <span style={{ color: '#94a3b8' }}>{result.wetland_area_acres.toFixed(2)} ac</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Buffer Area:</span>
          <span style={{ color: '#94a3b8' }}>{result.wetland_buffer_area_acres.toFixed(2)} ac</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
          <span>Buildable Ratio:</span>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>
            {buildablePct.toFixed(1)}%
          </span>
        </div>
      </div>

    </div>
  );
}
