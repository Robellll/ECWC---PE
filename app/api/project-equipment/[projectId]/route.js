import { sql } from '@/lib/db.js';
import {
  requireEquipmentProjectAccess,
  jsonOk,
  jsonError,
} from '@/lib/api-helpers.js';
import { mapEquipment, mapProject, mapContact, EQUIPMENT_STATUS_FROM_UI } from '@/lib/mappers.js';
import {
  writeAuditLog, AUDIT_ACTION, AUDIT_MODULE, auditHref, actorName,
} from '@/lib/audit-log.js';
import { z } from 'zod';

const createSchema = z.object({
  assetNo: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  plateSerial: z.string().min(1),
  model: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  status: z.string().optional(),
  operatorName: z.string().optional(),
  operatorPhone: z.string().optional(),
  capacity: z.string().optional(),
  remarks: z.string().optional(),
  managerNotes: z.string().optional(),
  photo: z.string().optional(),
});

export async function GET(_request, { params }) {
  const { projectId } = await params;
  const { error } = await requireEquipmentProjectAccess(projectId, 'view');
  if (error) return error;

  const [projectRow] = await sql`SELECT * FROM projects WHERE id = ${projectId} AND NOT is_unassigned`;
  if (!projectRow) return jsonError('Project not found', 404);

  const contacts = await sql`
    SELECT * FROM project_contacts WHERE project_id = ${projectId} ORDER BY sort_order
  `;
  const mappedContacts = contacts.map(mapContact);

  const equipment = await sql`
    SELECT e.*, p.name AS project_name, u.name AS added_by_name
    FROM equipment e
    JOIN projects p ON p.id = e.project_id
    LEFT JOIN users u ON u.id = e.added_by_user_id
    WHERE e.project_id = ${projectId}
    ORDER BY e.code ASC
  `;

  const stats = {
    total: equipment.length,
    operable: equipment.filter((e) => e.status === 'operational').length,
    idle: equipment.filter((e) => e.status === 'idle').length,
    down: equipment.filter((e) => e.status === 'breakdown' || e.status === 'under_maintenance').length,
  };

  return jsonOk({
    project: mapProject(projectRow, {
      adminContact: mappedContacts.find((c) => c.role === 'admin') || null,
      maintenanceContact: mappedContacts.find((c) => c.role === 'maintenance') || null,
      equipmentTotal: stats.total,
      equipmentOperable: stats.operable,
      equipmentIdle: stats.idle,
      equipmentDown: stats.down,
    }),
    stats,
    equipment: equipment.map(mapEquipment),
  });
}

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { session, error } = await requireEquipmentProjectAccess(projectId, 'edit');
  if (error) return error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;

  const assetNo = (d.assetNo || d.code || '').trim();
  const model = (d.model || d.name || '').trim();
  if (!assetNo || !model) return jsonError('Asset No. and model are required');

  const status = EQUIPMENT_STATUS_FROM_UI[d.status] || 'operational';
  const remarks = d.remarks ?? d.managerNotes ?? '';

  const rows = await sql`
    INSERT INTO equipment (
      code, name, type, project_id, plate_serial, capacity, status,
      manager_notes, operator_name, operator_phone, photo,
      added_by_user_id, status_updated_at
    )
    VALUES (
      ${assetNo.toUpperCase()}, ${model}, 'other'::equipment_type,
      ${projectId}, ${d.plateSerial.trim()}, ${d.capacity?.trim() || ''},
      ${status}::equipment_status,
      ${remarks}, ${d.operatorName?.trim() || ''}, ${d.operatorPhone?.trim() || ''},
      ${d.photo || ''},
      ${session.user.id}, NOW()
    )
    RETURNING *
  `;

  const full = await sql`
    SELECT e.*, p.name AS project_name, u.name AS added_by_name
    FROM equipment e
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN users u ON u.id = e.added_by_user_id
    WHERE e.id = ${rows[0].id}
  `;
  const mapped = mapEquipment(full[0]);
  await writeAuditLog(session, {
    action: AUDIT_ACTION.CREATED,
    module: AUDIT_MODULE.EQUIPMENT,
    entityId: mapped.id,
    projectId,
    href: auditHref.equipment(projectId, mapped.id),
    summary: `${actorName(session)} registered equipment ${assetNo.toUpperCase()} (${model})`,
  });
  return jsonOk(mapped, 201);
}
