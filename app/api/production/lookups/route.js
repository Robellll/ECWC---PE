import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';
import { mapProdMaterial, mapProdPlant } from '@/lib/production/mappers.js';

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;

  const [materials, projects, plants] = await Promise.all([
    sql`SELECT * FROM prod_materials ORDER BY name`,
    sql`
      SELECT pp.id, pp.name, COUNT(pl.id)::int AS plant_count
      FROM prod_projects pp
      LEFT JOIN prod_plants pl ON pl.assigned_project_id = pp.id
      GROUP BY pp.id, pp.name
      ORDER BY pp.name
    `,
    sql`
      SELECT pl.*, pp.name AS project_name
      FROM prod_plants pl
      LEFT JOIN prod_projects pp ON pp.id = pl.assigned_project_id
      ORDER BY pl.name
    `,
  ]);

  return jsonOk({
    materials: materials.map(mapProdMaterial),
    projects: projects.map((r) => ({
      id: r.id,
      name: r.name,
      plantCount: Number(r.plant_count),
    })),
    plants: plants.map((r) => mapProdPlant(r)),
  });
}
