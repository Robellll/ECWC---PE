import { sql } from '@/lib/db.js';
import {
  requireEquipmentItemAccess,
  jsonOk,
  jsonError,
} from '@/lib/api-helpers.js';
import { mapEquipment, EQUIPMENT_STATUS_FROM_UI } from '@/lib/mappers.js';
import { getRolePermissions } from '@/lib/permissions.js';
import { canReassignEquipment } from '@/lib/equipment-access.js';
import {
  writeAuditLog, AUDIT_ACTION, AUDIT_MODULE, auditHref, actorName,
} from '@/lib/audit-log.js';
import { z } from 'zod';

const updateSchema = z.object({
  assetNo: z.string().optional(),
  code: z.string().optional(),
  plateSerial: z.string().optional(),
  model: z.string().optional(),
  name: z.string().optional(),
  project: z.string().optional(),
  projectId: z.string().uuid().optional().nullable(),
  capacity: z.string().optional(),
  status: z.string().optional(),
  operatorName: z.string().optional(),
  operatorPhone: z.string().optional(),
  remarks: z.string().optional(),
  managerNotes: z.string().optional(),
  photo: z.string().optional(),
  clearPhoto: z.boolean().optional(),
});

export async function GET(_request, { params }) {
  const { id } = await params;
  const { error } = await requireEquipmentItemAccess(id, 'view');
  if (error) return error;
  const rows = await sql`
    SELECT e.*, p.name AS project_name, u.name AS added_by_name
    FROM equipment e
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN users u ON u.id = e.added_by_user_id
    WHERE e.id = ${id}
  `;
  return jsonOk(mapEquipment(rows[0]));
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { session, equipment: existing, error } = await requireEquipmentItemAccess(id, 'edit');
  if (error) return error;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;
  const perms = getRolePermissions(session.user.role);

  let projectId = existing.project_id;
  if (d.projectId !== undefined || d.project) {
    if (!canReassignEquipment(perms)) {
      return jsonError('Cannot change project assignment', 403);
    }
    if (d.projectId !== undefined) projectId = d.projectId;
    else if (d.project) {
      const p = await sql`SELECT id FROM projects WHERE name = ${d.project} LIMIT 1`;
      projectId = p[0]?.id || existing.project_id;
    }
  }
  if (!projectId) return jsonError('Equipment must belong to a project', 400);

  const code = (d.assetNo || d.code)?.toUpperCase() ?? existing.code;
  const name = (d.model || d.name) ?? existing.name;
  const plateSerial = d.plateSerial !== undefined ? d.plateSerial : existing.plate_serial;
  const status = d.status ? (EQUIPMENT_STATUS_FROM_UI[d.status] || d.status) : existing.status;
  const capacity = d.capacity !== undefined ? d.capacity : existing.capacity;
  const managerNotes = d.remarks ?? d.managerNotes ?? existing.manager_notes;
  const operatorName = d.operatorName !== undefined ? d.operatorName : existing.operator_name;
  const operatorPhone = d.operatorPhone !== undefined ? d.operatorPhone : existing.operator_phone;
  let photo = existing.photo;
  if (d.clearPhoto) photo = '';
  else if (d.photo !== undefined) photo = d.photo;

  await sql`
    UPDATE equipment SET
      code = ${code},
      name = ${name},
      plate_serial = ${plateSerial || ''},
      project_id = ${projectId},
      capacity = ${capacity || ''},
      status = ${status}::equipment_status,
      manager_notes = ${managerNotes || ''},
      operator_name = ${operatorName || ''},
      operator_phone = ${operatorPhone || ''},
      photo = ${photo || ''},
      status_updated_at = CASE WHEN ${status}::text != ${existing.status}::text THEN NOW() ELSE status_updated_at END,
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
  const mapped = mapEquipment(rows[0]);
  await writeAuditLog(session, {
    action: AUDIT_ACTION.UPDATED,
    module: AUDIT_MODULE.EQUIPMENT,
    entityId: id,
    projectId,
    href: auditHref.equipment(projectId, id),
    summary: `${actorName(session)} updated equipment ${code} (${name})`,
  });
  return jsonOk(mapped);
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { session, equipment: existing, error } = await requireEquipmentItemAccess(id, 'delete');
  if (error) return error;
  const projectId = existing.project_id;
  await sql`DELETE FROM equipment WHERE id = ${id}`;
  await writeAuditLog(session, {
    action: AUDIT_ACTION.DELETED,
    module: AUDIT_MODULE.EQUIPMENT,
    entityId: id,
    projectId,
    href: auditHref.equipmentProject(projectId),
    summary: `${actorName(session)} deleted equipment ${existing.code} (${existing.name})`,
  });
  return jsonOk({ success: true });
}
