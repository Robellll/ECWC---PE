import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdPlant, logProdAudit } from '@/lib/production/mappers.js';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  plantType: z.enum(['aggregate', 'crusher', 'ready_mix', 'asphalt', 'sand', 'base_course']),
  capacity: z.number().min(0),
  unit: z.string().min(1),
  location: z.string().optional(),
  assignedProjectId: z.string().uuid().nullable().optional(),
  status: z.enum(['running', 'idle', 'maintenance', 'out_of_service']).optional(),
  commissionDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

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
  const statusChanged = existing[0].status !== (d.status || existing[0].status);

  const rows = await sql`
    UPDATE prod_plants SET
      name = ${d.name}, code = ${d.code},
      plant_type = ${d.plantType}::prod_plant_type,
      capacity = ${d.capacity}, unit = ${d.unit},
      location = ${d.location || ''},
      assigned_project_id = ${d.assignedProjectId || null},
      status = ${(d.status || 'idle')}::prod_plant_status,
      commission_date = ${d.commissionDate || null},
      notes = ${d.notes || ''},
      status_changed_at = CASE WHEN ${statusChanged} THEN NOW() ELSE status_changed_at END,
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  if (d.assignedProjectId) {
    await sql`
      INSERT INTO prod_plant_projects (plant_id, project_id)
      VALUES (${id}, ${d.assignedProjectId}) ON CONFLICT DO NOTHING
    `;
  }
  await logProdAudit(session.user.id, 'plant', id, 'update', d.name);
  return jsonOk(mapProdPlant(rows[0]));
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
