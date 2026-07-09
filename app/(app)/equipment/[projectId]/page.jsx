import { Suspense } from 'react';
import ProjectEquipmentDetail from '@/components/pages/ProjectEquipmentDetail';

export default async function Page({ params }) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<p className="page-subtitle" style={{ padding: '1.5rem' }}>Loading…</p>}>
      <ProjectEquipmentDetail projectId={projectId} />
    </Suspense>
  );
}
