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
import { validateAssetRegisterFields, validateStatusReason } from '@/lib/equipment-form.js';
import {
  dbTypeFromEquipmentTypeLabel,
  parseOptionalNumber,
  parseOptionalYear,
} from '@/lib/equipment-register.js';

const createSchema = z.object({
  assetNo: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  category: z.string().min(1),
  equipmentType: z.string().min(1),
  make: z.string().min(1),
  manufacturingYear: z.union([z.string(), z.number()]).optional().nullable(),
  fuelNorm: z.union([z.string(), z.number()]).optional().nullable(),
  leaseRateHour: z.union([z.string(), z.number()]).optional().nullable(),
  plateSerial: z.string().optional(),
  status: z.string().optional(),
  statusReason: z.string().optional(),
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
  const name = (d.name || d.model || '').trim();
  const formCheck = validateAssetRegisterFields({
    assetNo,
    name,
    category: d.category,
    equipmentType: d.equipmentType,
    make: d.make,
    manufacturingYear: d.manufacturingYear,
    fuelNorm: d.fuelNorm,
    leaseRateHour: d.leaseRateHour,
  });
  if (formCheck) return jsonError(formCheck);

  const status = EQUIPMENT_STATUS_FROM_UI[d.status] || 'operational';
  const remarks = d.remarks ?? d.managerNotes ?? '';
  const statusReason = d.statusReason?.trim() || '';
  const uiStatus = d.status || 'Operational';
  const reasonError = validateStatusReason(uiStatus, statusReason);
  if (reasonError) return jsonError(reasonError);

  const dbType = dbTypeFromEquipmentTypeLabel(d.equipmentType);
  const year = parseOptionalYear(d.manufacturingYear);
  const fuelNorm = parseOptionalNumber(d.fuelNorm);
  const leaseRate = parseOptionalNumber(d.leaseRateHour);

  const rows = await sql`
    INSERT INTO equipment (
      code, name, type, category, equipment_type_label, make,
      manufacturing_year, fuel_norm, lease_rate_hour,
      project_id, plate_serial, capacity, status,
      status_reason, manager_notes, operator_name, operator_phone, photo,
      added_by_user_id, status_updated_at
    )
    VALUES (
      ${assetNo.toUpperCase()}, ${name}, ${dbType}::equipment_type,
      ${d.category.trim()}, ${d.equipmentType.trim()}, ${d.make.trim()},
      ${year}, ${fuelNorm}, ${leaseRate},
      ${projectId}, ${d.plateSerial?.trim() || ''}, ${d.capacity?.trim() || ''},
      ${status}::equipment_status,
      ${status === 'operational' ? '' : statusReason},
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
    summary: `${actorName(session)} registered equipment ${assetNo.toUpperCase()} (${name})`,
  });
  return jsonOk(mapped, 201);
}
