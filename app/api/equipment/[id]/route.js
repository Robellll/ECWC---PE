import { sql } from '@/lib/db.js';
import { requireSession, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapEquipment, EQUIPMENT_TYPE_FROM_UI, EQUIPMENT_STATUS_FROM_UI } from '@/lib/mappers.js';
import { z } from 'zod';

const updateSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  project: z.string().optional(),
  projectId: z.string().uuid().optional().nullable(),
  capacity: z.string().optional(),
  status: z.string().optional(),
  managerNotes: z.string().optional(),
});

export async function GET(_request, { params }) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await params;
  const rows = await sql`
    SELECT e.*, p.name AS project_name, u.name AS added_by_name
    FROM equipment e
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN users u ON u.id = e.added_by_user_id
    WHERE e.id = ${id}
  `;
  if (!rows[0]) return jsonError('Not found', 404);
  return jsonOk(mapEquipment(rows[0]));
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission((p) => p.isEquipmentEditor);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const existing = await sql`SELECT * FROM equipment WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  const d = parsed.data;
  let projectId = existing[0].project_id;
  if (d.projectId !== undefined) projectId = d.projectId;
  else if (d.project) {
    if (d.project === 'Idle / Unassigned') projectId = null;
    else {
      const p = await sql`SELECT id FROM projects WHERE name = ${d.project} LIMIT 1`;
      projectId = p[0]?.id || null;
    }
  }
  const type = d.type ? (EQUIPMENT_TYPE_FROM_UI[d.type] || d.type) : existing[0].type;
  const status = d.status ? (EQUIPMENT_STATUS_FROM_UI[d.status] || d.status) : existing[0].status;
  await sql`
    UPDATE equipment SET
      code = ${d.code?.toUpperCase() ?? existing[0].code},
      name = ${d.name ?? existing[0].name},
      type = ${type}::equipment_type,
      project_id = ${projectId},
      capacity = ${d.capacity ?? existing[0].capacity},
      status = ${status}::equipment_status,
      manager_notes = ${d.managerNotes ?? existing[0].manager_notes},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  const rows = await sql`
    SELECT e.*, p.name AS project_name, u.name AS added_by_name
    FROM equipment e
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN users u ON u.id = e.added_by_user_id
    WHERE e.id = ${id}
  `;
  return jsonOk(mapEquipment(rows[0]));
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission((p) => p.isEquipmentEditor);
  if (error) return error;
  const { id } = await params;
  await sql`DELETE FROM equipment WHERE id = ${id}`;
  return jsonOk({ success: true });
}
