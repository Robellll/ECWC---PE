'use client';

import { useEffect } from 'react';

export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Page error</h2>
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        {error?.message || 'This page failed to load.'}
      </p>
      <button type="button" className="btn-primary" onClick={() => reset()}>
        Reload page
      </button>
    </div>
  );
}
