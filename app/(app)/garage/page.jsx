import { Suspense } from 'react';
import CentralGarage from '@/components/pages/CentralGarage';
import AppLoader from '@/components/ui/AppLoader';

export default function GaragePage() {
  return (
    <Suspense fallback={<AppLoader label="Loading garage…" variant="page" />}>
      <CentralGarage />
    </Suspense>
  );
}
