import { sql } from '@/lib/db.js';
import { requireSession, jsonOk } from '@/lib/api-helpers.js';

export async function GET(request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  let projectId = searchParams.get('projectId') || session.user.projectId;

  if (!projectId) {
    const [first] = await sql`SELECT id FROM projects WHERE NOT is_unassigned ORDER BY sort_order LIMIT 1`;
    projectId = first?.id;
  }

  const [assigned] = await sql`
    SELECT COUNT(*)::int AS count FROM equipment WHERE project_id = ${projectId}
  `;
  const [active] = await sql`
    SELECT COUNT(*)::int AS count FROM equipment WHERE project_id = ${projectId} AND status = 'operational'
  `;
  const [garage] = await sql`
    SELECT COUNT(*)::int AS count FROM garage_vehicles WHERE status = 'in_progress'
  `;

  const total = assigned.count;
  const activeCount = active.count;
  const utilization = total === 0 ? 0 : Math.round((activeCount / total) * 1000) / 10;

  const [project] = await sql`SELECT name FROM projects WHERE id = ${projectId}`;

  return jsonOk({
    projectId,
    projectName: project?.name || 'Unknown',
    assignedEquipment: total,
    activeOnSite: activeCount,
    utilizationPercent: utilization,
    garageInProgress: garage.count,
  });
}
