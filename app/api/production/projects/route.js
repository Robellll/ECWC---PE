import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';

/** Read-only list of production projects (created via plant registration). */
export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;

  const rows = await sql`
    SELECT
      pp.id,
      pp.name,
      COUNT(pl.id)::int AS plant_count
    FROM prod_projects pp
    LEFT JOIN prod_plants pl ON pl.assigned_project_id = pp.id
    GROUP BY pp.id, pp.name
    ORDER BY pp.name
  `;

  return jsonOk(rows.map((r) => ({
    id: r.id,
    name: r.name,
    plantCount: Number(r.plant_count),
  })));
}
