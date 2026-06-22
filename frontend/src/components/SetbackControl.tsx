import { Ruler, Loader2, Play } from 'lucide-react';

interface SetbackControlProps {
  value: number;
  onChange: (value: number) => void;
  onAnalyze: () => void;
  loading: boolean;
}

export default function SetbackControl({
  value,
  onChange,
  onAnalyze,
  loading,
}: SetbackControlProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          color: '#cbd5e1', 
          fontSize: '0.875rem', 
          marginBottom: '0.5rem', 
          fontWeight: 500 
        }}>
          <Ruler size={16} /> Wetland Setback Distance (ft)
        </label>
        <input 
          type="number" 
          className="input-field" 
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={0}
          step={10}
        />
      </div>

      <button 
        className="btn-primary" 
        onClick={onAnalyze}
        disabled={loading}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
        {loading ? 'Analyzing...' : 'Run Analysis'}
      </button>
    </div>
  );
}
