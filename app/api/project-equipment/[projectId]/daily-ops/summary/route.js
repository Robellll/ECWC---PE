import { sql } from '@/lib/db.js';
import {
  requireEquipmentProjectAccess,
  jsonOk,
  jsonError,
} from '@/lib/api-helpers.js';
import {
  calcPeriodOpsSummary,
  mapPeriodOpsSummaryRow,
} from '@/lib/equipment-daily-ops.js';

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { error } = await requireEquipmentProjectAccess(projectId, 'view');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return jsonError('from and to date parameters are required');
  }
  if (from > to) {
    return jsonError('from date must be on or before to date');
  }

  const [project] = await sql`
    SELECT id, name FROM projects WHERE id = ${projectId} AND NOT is_unassigned
  `;
  if (!project) return jsonError('Project not found', 404);

  const rows = await sql`
    SELECT
      e.id AS equipment_id,
      e.code AS asset_no,
      e.name AS asset_name,
      e.category,
      e.equipment_type_label,
      COUNT(*)::int AS days_logged,
      COALESCE(SUM(o.operable_hr), 0) AS operable_hr,
      COALESCE(SUM(o.idle_hr), 0) AS idle_hr,
      COALESCE(SUM(o.down_hr), 0) AS down_hr
    FROM equipment_daily_ops o
    JOIN equipment e ON e.id = o.equipment_id
    WHERE o.project_id = ${projectId}
      AND o.ops_date >= ${from}::date
      AND o.ops_date <= ${to}::date
    GROUP BY e.id, e.code, e.name, e.category, e.equipment_type_label
    ORDER BY e.code ASC
  `;

  const assets = rows.map(mapPeriodOpsSummaryRow);
  const fleet = calcPeriodOpsSummary({
    operableHr: assets.reduce((s, a) => s + a.operableHr, 0),
    idleHr: assets.reduce((s, a) => s + a.idleHr, 0),
    downHr: assets.reduce((s, a) => s + a.downHr, 0),
    daysLogged: assets.reduce((s, a) => s + a.daysLogged, 0),
  });

  return jsonOk({
    project: { id: project.id, name: project.name },
    from,
    to,
    assets,
    fleet: {
      ...fleet,
      assetCount: assets.length,
    },
  });
}
