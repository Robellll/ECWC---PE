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
      VALUES (${plantId}, ${projectId}) ON CONFLICT DO NOTHING
    `;
    await sql`
      UPDATE prod_plants SET assigned_project_id = ${projectId}, updated_at = NOW()
      WHERE id = ${plantId}
    `;
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid project data');
  const d = parsed.data;

  const rows = await sql`
    UPDATE prod_projects SET
      name = ${d.name}, code = ${d.code},
      region = ${d.region || ''}, location = ${d.location || ''}, client = ${d.client || ''},
      status = ${(d.status || 'active')}::prod_project_status,
      start_date = ${d.startDate || null}, end_date = ${d.endDate || null},
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return jsonError('Not found', 404);
  if (d.plantIds) await syncPlantProjects(id, d.plantIds);
  await logProdAudit(session.user.id, 'project', id, 'update', d.name);
  const plantIds = await attachPlantIds(id);
  return jsonOk(mapProdProject(rows[0], plantIds));
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const rows = await sql`DELETE FROM prod_projects WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'project', id, 'delete', '');
  return jsonOk({ ok: true });
}
