import { Suspense } from 'react';
import ProjectGarageDetail from '@/components/pages/ProjectGarageDetail';
import AppLoader from '@/components/ui/AppLoader';

export default async function ProjectGarageDetailPage({ params }) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<AppLoader label="Loading project garage…" variant="page" />}>
      <ProjectGarageDetail projectId={projectId} />
    </Suspense>
  );
}
