import { Suspense } from 'react';
import ProjectEquipment from '@/components/pages/ProjectEquipment';
import AppLoader from '@/components/ui/AppLoader';

export default function EquipmentPage() {
  return (
    <Suspense fallback={<AppLoader label="Loading equipment…" variant="page" />}>
      <ProjectEquipment />
    </Suspense>
  );
}
