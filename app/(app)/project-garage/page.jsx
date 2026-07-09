import { Suspense } from 'react';
import ProjectGarage from '@/components/pages/ProjectGarage';
import AppLoader from '@/components/ui/AppLoader';

export default function ProjectGaragePage() {
  return (
    <Suspense fallback={<AppLoader label="Loading project garage…" variant="page" />}>
      <ProjectGarage />
    </Suspense>
  );
}
