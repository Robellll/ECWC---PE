import { Suspense } from 'react';
import EquipmentReports from '@/components/pages/EquipmentReports';
import AppLoader from '@/components/ui/AppLoader';

export default async function Page({ params }) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<AppLoader label="Loading equipment reports…" variant="page" />}>
      <EquipmentReports projectId={projectId} />
    </Suspense>
  );
}
