
function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0b0f19',
      color: '#f3f4f6'
    }}>
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(90deg, #111827 0%, #0f172a 100%)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.025em' }}>
          📐 Buildable Land Analyzer
        </h1>
        <span style={{
          fontSize: '0.875rem',
          backgroundColor: '#1e293b',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          color: '#38bdf8',
          border: '1px solid #334155'
        }}>
          FastAPI + GeoPandas + React + MapLibre
        </span>
      </header>
      <main style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          textAlign: 'center',
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(8px)',
          padding: '2.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{ fontSize: '1.875rem', marginBottom: '1rem', color: '#ffffff' }}>Ready for Geospatial Analysis</h2>
          <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '2rem' }}>
            Production-ready boilerplates and docker containers have been successfully generated. Start adding your geo-processing routes in the backend and map views in the frontend.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Backend port: :8000</span>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>•</span>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Frontend port: :5173</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
