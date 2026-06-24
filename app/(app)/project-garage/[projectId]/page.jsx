import ProjectGarageDetail from '@/components/pages/ProjectGarageDetail';

export default async function ProjectGarageDetailPage({ params }) {
  const { projectId } = await params;
  return <ProjectGarageDetail projectId={projectId} />;
}
