import { Suspense } from 'react';
import CentralGarage from '@/components/pages/CentralGarage';

export default function GaragePage() {
  return (
    <Suspense fallback={<p className="page-subtitle" style={{ padding: '1.5rem' }}>Loading garage…</p>}>
      <CentralGarage />
    </Suspense>
  );
}
