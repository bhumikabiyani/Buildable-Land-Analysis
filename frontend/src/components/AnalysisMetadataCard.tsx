import { Clock, Navigation, Zap, Square } from 'lucide-react';
import { formatAcres } from '../utils/derivedMetrics';

interface AnalysisMetadataProps {
  lastCompleted: string | null;
  setbackUsed: number;
  durationMs: number | null;
  parcelArea?: number | null;
}

export default function AnalysisMetadataCard({
  lastCompleted,
  setbackUsed,
  durationMs,
  parcelArea,
}: AnalysisMetadataProps) {
  if (!lastCompleted || durationMs === null) return null;

  return (
    <div style={{
      marginTop: '1.25rem',
      padding: '1rem',
      background: 'rgba(30, 41, 59, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      fontSize: '0.8125rem',
      color: '#94a3b8',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.625rem',
    }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingBottom: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}>
        <Zap size={12} color="#f59e0b" />
        Metadata
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Clock size={12} /> Last Run
        </span>
        <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{lastCompleted}</span>
      </div>

      {parcelArea !== undefined && parcelArea !== null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Square size={12} /> Parcel Area
          </span>
          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{formatAcres(parcelArea)}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Navigation size={12} style={{ transform: 'rotate(45deg)' }} /> Setback
        </span>
        <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{setbackUsed} ft</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Zap size={12} /> Duration
        </span>
        <span style={{ color: '#34d399', fontWeight: 600, fontFamily: 'monospace' }}>{durationMs} ms</span>
      </div>
    </div>
  );
}
