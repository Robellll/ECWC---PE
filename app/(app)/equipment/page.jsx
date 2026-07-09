import { Suspense } from 'react';
import ProjectEquipment from '@/components/pages/ProjectEquipment';

export default function EquipmentPage() {
  return (
    <Suspense fallback={<p className="page-subtitle" style={{ padding: '1.5rem' }}>Loading equipment…</p>}>
      <ProjectEquipment />
    </Suspense>
  );
}
