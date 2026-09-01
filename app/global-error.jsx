'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>ECWC Plant &amp; Equipment</h1>
        <p style={{ color: '#64748b', textAlign: 'center', maxWidth: 420 }}>
          {error?.message || 'A critical error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{ padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
