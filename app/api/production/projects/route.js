import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdProject, logProdAudit } from '@/lib/production/mappers.js';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  region: z.string().optional(),
  location: z.string().optional(),
  client: z.string().optional(),
  status: z.enum(['active', 'on_hold', 'completed', 'cancelled']).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  plantIds: z.array(z.string().uuid()).optional(),
});

async function attachPlantIds(projectId) {
  const links = await sql`
    SELECT plant_id FROM prod_plant_projects WHERE project_id = ${projectId}
  `;
  return links.map((l) => l.plant_id);
}

async function syncPlantProjects(projectId, plantIds = []) {
  await sql`DELETE FROM prod_plant_projects WHERE project_id = ${projectId}`;
  for (const plantId of plantIds) {
    await sql`
      INSERT INTO prod_plant_projects (plant_id, project_id)
      VALUES (${plantId}, ${projectId})
      ON CONFLICT DO NOTHING
    `;
    await sql`
      UPDATE prod_plants SET assigned_project_id = ${projectId}, updated_at = NOW()
      WHERE id = ${plantId}
    `;
  }
}

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;
  const rows = await sql`SELECT * FROM prod_projects ORDER BY name`;
  const result = [];
  for (const row of rows) {
    const plantIds = await attachPlantIds(row.id);
    result.push(mapProdProject(row, plantIds));
  }
  return jsonOk(result);
}

export async function POST(request) {
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid project data');

  const d = parsed.data;
  const rows = await sql`
    INSERT INTO prod_projects (name, code, region, location, client, status, start_date, end_date)
    VALUES (
      ${d.name}, ${d.code}, ${d.region || ''}, ${d.location || ''}, ${d.client || ''},
      ${(d.status || 'active')}::prod_project_status,
      ${d.startDate || null}, ${d.endDate || null}
    ) RETURNING *
  `;
  if (d.plantIds?.length) await syncPlantProjects(rows[0].id, d.plantIds);
  await logProdAudit(session.user.id, 'project', rows[0].id, 'create', d.name);
  const plantIds = await attachPlantIds(rows[0].id);
  return jsonOk(mapProdProject(rows[0], plantIds), 201);
}
