import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';
import { mapProdMaterial, mapProdProject, mapProdPlant } from '@/lib/production/mappers.js';

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;

  const [materials, projects, plants] = await Promise.all([
    sql`SELECT * FROM prod_materials ORDER BY name`,
    sql`SELECT * FROM prod_projects ORDER BY name`,
    sql`
      SELECT pl.*, p.name AS project_name
      FROM prod_plants pl
      LEFT JOIN prod_projects p ON p.id = pl.assigned_project_id
      ORDER BY pl.name
    `,
  ]);

  return jsonOk({
    materials: materials.map(mapProdMaterial),
    projects: projects.map((r) => mapProdProject(r, [])),
    plants: plants.map((r) => mapProdPlant(r)),
  });
}
