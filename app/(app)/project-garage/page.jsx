import { Suspense } from 'react';
import ProjectGarage from '@/components/pages/ProjectGarage';

export default function ProjectGaragePage() {
  return (
    <Suspense fallback={<p className="page-subtitle" style={{ padding: '1.5rem' }}>Loading project garage…</p>}>
      <ProjectGarage />
    </Suspense>
  );
}
