'use client';

import Link from 'next/link';
import '@/components/production/ProductionShell.css';

export default function ProductionFilterBanner({ label, clearHref }) {
  if (!label) return null;

  return (
    <p className="production-filter-hint">
      Showing: <strong>{label}</strong>
      {clearHref && (
        <>
          {' · '}
          <Link href={clearHref} className="production-filter-clear">Show all</Link>
        </>
      )}
    </p>
  );
}
