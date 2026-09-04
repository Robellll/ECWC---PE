import { Suspense } from 'react';
import EquipmentDailyOps from '@/components/pages/EquipmentDailyOps';
import AppLoader from '@/components/ui/AppLoader';

export default async function Page({ params }) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<AppLoader label="Loading daily operations…" variant="page" />}>
      <EquipmentDailyOps projectId={projectId} />
    </Suspense>
  );
}
