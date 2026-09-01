'use client';

import { useEffect } from 'react';
import AppLoader from '@/components/ui/AppLoader';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
      <AppLoader label="Something went wrong" variant="inline" />
      <p style={{ color: '#64748b', textAlign: 'center', maxWidth: 420 }}>
        {error?.message || 'An unexpected error occurred.'}
      </p>
      <button type="button" className="btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
