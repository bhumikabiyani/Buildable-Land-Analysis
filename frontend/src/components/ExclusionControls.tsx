import { Eraser, Shapes } from 'lucide-react';

interface ExclusionControlsProps {
  exclusionCount: number;
  onClear: () => void;
}

export default function ExclusionControls({ exclusionCount, onClear }: ExclusionControlsProps) {
  return (
    <div style={{
      padding: '1rem',
      background: 'rgba(30, 41, 59, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        color: '#94a3b8',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 500 }}>
          <Shapes size={14} color="#fbbf24" />
          Drawn Exclusions
        </span>
        <span style={{
          color: exclusionCount > 0 ? '#fbbf24' : '#64748b',
          fontWeight: 600,
          fontFamily: 'monospace',
        }}>
          {exclusionCount}
        </span>
      </div>

      <button
        type="button"
        className="btn-secondary"
        onClick={onClear}
        disabled={exclusionCount === 0}
      >
        <Eraser size={16} />
        Clear Exclusions
      </button>
    </div>
  );
}
