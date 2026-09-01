import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdPlant, logProdAudit } from '@/lib/production/mappers.js';
import { assignPlantToProject } from '@/lib/production/projects.js';
import { validatePlantStatus } from '@/lib/production/plant-status.js';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  plantType: z.enum(['aggregate', 'crusher', 'ready_mix', 'asphalt', 'sand', 'base_course']),
  capacity: z.number().min(0),
  unit: z.string().min(1),
  projectName: z.string().min(2),
  status: z.enum(['operable', 'idle', 'down']).optional(),
  statusReason: z.string().optional(),
  commissionDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

async function enrichPlant(plantId) {
  const rows = await sql`
    SELECT pl.*, pp.name AS project_name
    FROM prod_plants pl
    LEFT JOIN prod_projects pp ON pp.id = pl.assigned_project_id
    WHERE pl.id = ${plantId}
  `;
  return rows[0];
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid plant data');
  const d = parsed.data;

  const existing = await sql`SELECT status FROM prod_plants WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);

  const status = d.status || existing[0].status || 'operable';
  const statusCheck = validatePlantStatus(status, d.statusReason || '');
  if (!statusCheck.ok) return jsonError(statusCheck.error);

  const statusChanged = existing[0].status !== status;

  await sql`
    UPDATE prod_plants SET
      name = ${d.name}, code = ${d.code},
      plant_type = ${d.plantType}::prod_plant_type,
      capacity = ${d.capacity}, unit = ${d.unit},
      status = ${status}::prod_plant_status,
      status_reason = ${statusCheck.statusReason},
      commission_date = ${d.commissionDate || null},
      notes = ${d.notes || ''},
      status_changed_at = CASE WHEN ${statusChanged} THEN NOW() ELSE status_changed_at END,
      updated_at = NOW()
    WHERE id = ${id}
  `;

  await assignPlantToProject(id, d.projectName);
  await logProdAudit(session.user.id, 'plant', id, 'update', d.name);
  return jsonOk(mapProdPlant(await enrichPlant(id)));
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const rows = await sql`DELETE FROM prod_plants WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'plant', id, 'delete', '');
  return jsonOk({ ok: true });
}
