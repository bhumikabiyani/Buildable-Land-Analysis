import { Loader2 } from 'lucide-react';

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="skeleton-shimmer" style={{ width: '40%', height: '12px', borderRadius: '4px', background: 'rgba(51, 65, 85, 0.5)' }} />
      <div className="skeleton-shimmer" style={{ width: '25%', height: '12px', borderRadius: '4px', background: 'rgba(51, 65, 85, 0.4)' }} />
    </div>
  );
}

export function SidebarLoadingSkeleton() {
  return (
    <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1rem', fontWeight: 600 }}>Analyzing Land...</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{
              height: '70px',
              background: i >= 2 ? `rgba(${i === 2 ? '34, 197, 94' : '59, 130, 246'}, 0.05)` : 'rgba(30, 41, 59, 0.4)',
              borderRadius: '12px',
              border: `1px solid rgba(255, 255, 255, ${i >= 2 ? '0.08' : '0.05'})`,
            }}
          />
        ))}
      </div>

      <div style={{
        marginTop: '0.5rem',
        padding: '1rem',
        background: 'rgba(30, 41, 59, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div className="skeleton-shimmer" style={{ width: '35%', height: '10px', borderRadius: '4px', background: 'rgba(51, 65, 85, 0.5)' }} />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}

export function MapLoadingSkeleton() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
      background: '#090d16',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="skeleton-shimmer" style={{
        width: '320px',
        height: '220px',
        background: 'rgba(59, 130, 246, 0.05)',
        border: '2px dashed rgba(59, 130, 246, 0.2)',
        borderRadius: '16px',
        position: 'relative',
      }}>
        <div className="skeleton-shimmer" style={{
          width: '100px',
          height: '80px',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px dashed rgba(239, 68, 68, 0.2)',
          borderRadius: '50%',
          position: 'absolute',
          top: '40px',
          left: '60px',
        }} />
        <div className="skeleton-shimmer" style={{
          width: '80px',
          height: '60px',
          background: 'rgba(34, 197, 94, 0.05)',
          border: '1px dashed rgba(34, 197, 94, 0.2)',
          borderRadius: '30%',
          position: 'absolute',
          bottom: '40px',
          right: '50px',
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1, marginTop: '1rem' }}>
        <Loader2 className="animate-spin" color="#3b82f6" size={18} />
        <p style={{ fontSize: '1rem', margin: 0, fontWeight: 500, color: '#94a3b8' }}>Performing spatial intersections...</p>
      </div>
    </div>
  );
}
