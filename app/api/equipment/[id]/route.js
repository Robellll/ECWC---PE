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
import { validateAssetRegisterFields, validateStatusReason } from '@/lib/equipment-form.js';
import {
  dbTypeFromEquipmentTypeLabel,
  parseOptionalNumber,
  parseOptionalYear,
} from '@/lib/equipment-register.js';

const updateSchema = z.object({
  assetNo: z.string().optional(),
  code: z.string().optional(),
  plateSerial: z.string().optional(),
  model: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  equipmentType: z.string().optional(),
  make: z.string().optional(),
  manufacturingYear: z.union([z.string(), z.number()]).optional().nullable(),
  fuelNorm: z.union([z.string(), z.number()]).optional().nullable(),
  leaseRateHour: z.union([z.string(), z.number()]).optional().nullable(),
  project: z.string().optional(),
  projectId: z.string().uuid().optional().nullable(),
  capacity: z.string().optional(),
  status: z.string().optional(),
  statusReason: z.string().optional(),
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
  const name = (d.name || d.model) ?? existing.name;
  const category = d.category !== undefined ? d.category.trim() : (existing.category || '');
  const equipmentType = d.equipmentType !== undefined
    ? d.equipmentType.trim()
    : (existing.equipment_type_label || '');
  const make = d.make !== undefined ? d.make.trim() : (existing.make || '');

  if (d.category !== undefined || d.equipmentType !== undefined || d.make !== undefined || d.name !== undefined || d.model !== undefined) {
    const formCheck = validateAssetRegisterFields({
      assetNo: code,
      name,
      category: category || 'Others',
      equipmentType: equipmentType || 'Electrical & Electronics',
      make: make || '-',
      manufacturingYear: d.manufacturingYear !== undefined ? d.manufacturingYear : existing.manufacturing_year,
      fuelNorm: d.fuelNorm !== undefined ? d.fuelNorm : existing.fuel_norm,
      leaseRateHour: d.leaseRateHour !== undefined ? d.leaseRateHour : existing.lease_rate_hour,
    });
    // Only enforce category/type match when both provided/present
    if (category && equipmentType) {
      const typeCheck = validateAssetRegisterFields({
        assetNo: code,
        name,
        category,
        equipmentType,
        make: make || '-',
        manufacturingYear: '',
        fuelNorm: '',
        leaseRateHour: '',
      });
      if (typeCheck && typeCheck.includes('Equipment Type')) return jsonError(typeCheck);
    }
    if (formCheck && (formCheck.includes('Year') || formCheck.includes('Fuel') || formCheck.includes('Lease'))) {
      return jsonError(formCheck);
    }
  }

  const plateSerial = d.plateSerial !== undefined ? d.plateSerial : existing.plate_serial;
  const status = d.status ? (EQUIPMENT_STATUS_FROM_UI[d.status] || d.status) : existing.status;
  const capacity = d.capacity !== undefined ? d.capacity : existing.capacity;
  const managerNotes = d.remarks ?? d.managerNotes ?? existing.manager_notes;
  const operatorName = d.operatorName !== undefined ? d.operatorName : existing.operator_name;
  const operatorPhone = d.operatorPhone !== undefined ? d.operatorPhone : existing.operator_phone;
  const year = d.manufacturingYear !== undefined
    ? parseOptionalYear(d.manufacturingYear)
    : existing.manufacturing_year;
  const fuelNorm = d.fuelNorm !== undefined
    ? parseOptionalNumber(d.fuelNorm)
    : (existing.fuel_norm != null ? Number(existing.fuel_norm) : null);
  const leaseRate = d.leaseRateHour !== undefined
    ? parseOptionalNumber(d.leaseRateHour)
    : (existing.lease_rate_hour != null ? Number(existing.lease_rate_hour) : null);
  const dbType = equipmentType
    ? dbTypeFromEquipmentTypeLabel(equipmentType)
    : existing.type;

  let statusReason = d.statusReason !== undefined ? d.statusReason.trim() : (existing.status_reason || '');
  if (status === 'operational') statusReason = '';
  else {
    const uiStatus = d.status || (existing.status === 'idle' ? 'Idle' : existing.status === 'operational' ? 'Operational' : 'Breakdown');
    const reasonError = validateStatusReason(uiStatus, statusReason);
    if (reasonError) return jsonError(reasonError);
  }
  let photo = existing.photo;
  if (d.clearPhoto) photo = '';
  else if (d.photo !== undefined) photo = d.photo;

  await sql`
    UPDATE equipment SET
      code = ${code},
      name = ${name},
      type = ${dbType}::equipment_type,
      category = ${category || ''},
      equipment_type_label = ${equipmentType || ''},
      make = ${make || ''},
      manufacturing_year = ${year},
      fuel_norm = ${fuelNorm},
      lease_rate_hour = ${leaseRate},
      plate_serial = ${plateSerial || ''},
      project_id = ${projectId},
      capacity = ${capacity || ''},
      status = ${status}::equipment_status,
      status_reason = ${statusReason},
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
