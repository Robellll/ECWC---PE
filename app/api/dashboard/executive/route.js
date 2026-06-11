import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';

export async function GET() {
  const { error } = await requirePermission((p) => p.isExecutive);
  if (error) return error;

  const [totalFleet] = await sql`SELECT COUNT(*)::int AS count FROM equipment`;
  const [active] = await sql`SELECT COUNT(*)::int AS count FROM equipment WHERE status = 'operational'`;
  const [maintenance] = await sql`SELECT COUNT(*)::int AS count FROM equipment WHERE status = 'under_maintenance'`;
  const [breakdown] = await sql`SELECT COUNT(*)::int AS count FROM equipment WHERE status = 'breakdown'`;
  const [garageActive] = await sql`SELECT COUNT(*)::int AS count FROM garage_vehicles WHERE status = 'in_progress'`;
  const [openClaims] = await sql`SELECT COUNT(*)::int AS count FROM insurance_claims WHERE status = 'open'`;

  const total = totalFleet.count;
  const activeCount = active.count;
  const utilization = total === 0 ? 0 : Math.round((activeCount / total) * 1000) / 10;

  const byProject = await sql`
    SELECT p.name, COUNT(e.id)::int AS total,
      COUNT(e.id) FILTER (WHERE e.status = 'operational')::int AS operational
    FROM projects p
    LEFT JOIN equipment e ON e.project_id = p.id
    WHERE NOT p.is_unassigned
    GROUP BY p.id, p.name
    ORDER BY p.sort_order
  `;

  return jsonOk({
    totalFleet: total,
    activeEquipment: activeCount,
    utilizationPercent: utilization,
    underMaintenance: maintenance.count,
    breakdownAlerts: breakdown.count,
    garageInProgress: garageActive.count,
    openInsuranceClaims: openClaims.count,
    byProject,
  });
}
