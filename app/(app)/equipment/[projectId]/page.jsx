import { Suspense } from 'react';
import ProjectEquipmentDetail from '@/components/pages/ProjectEquipmentDetail';
import AppLoader from '@/components/ui/AppLoader';

export default async function Page({ params }) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<AppLoader label="Loading project equipment…" variant="page" />}>
      <ProjectEquipmentDetail projectId={projectId} />
    </Suspense>
  );
}
