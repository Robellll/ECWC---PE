import { sql } from '@/lib/db.js';
import {
  requireEquipmentProjectAccess,
  jsonOk,
  jsonError,
} from '@/lib/api-helpers.js';
import { EQUIPMENT_STATUS_FROM_UI } from '@/lib/mappers.js';
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

const bulkItemSchema = z.object({
  assetNo: z.string().min(1),
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
  remarks: z.string().optional(),
});

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { session, error } = await requireEquipmentProjectAccess(projectId, 'edit');
  if (error) return error;

  const body = await request.json();
  const parsed = z.object({ items: z.array(bulkItemSchema).min(1) }).safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  for (const item of parsed.data.items) {
    const name = (item.name || item.model || '').trim();
    const formCheck = validateAssetRegisterFields({
      assetNo: item.assetNo,
      name,
      category: item.category,
      equipmentType: item.equipmentType,
      make: item.make,
      manufacturingYear: item.manufacturingYear,
      fuelNorm: item.fuelNorm,
      leaseRateHour: item.leaseRateHour,
    });
    if (formCheck) return jsonError(`${item.assetNo.trim().toUpperCase()}: ${formCheck}`);
    const reasonError = validateStatusReason(item.status || 'Operational', item.statusReason);
    if (reasonError) return jsonError(`${item.assetNo.trim().toUpperCase()}: ${reasonError}`);
  }

  const items = parsed.data.items.map((item) => {
    const name = (item.name || item.model || '').trim();
    const status = EQUIPMENT_STATUS_FROM_UI[item.status] || 'operational';
    return {
      assetNo: item.assetNo.trim().toUpperCase(),
      name,
      category: item.category.trim(),
      equipmentType: item.equipmentType.trim(),
      make: item.make.trim(),
      manufacturingYear: parseOptionalYear(item.manufacturingYear),
      fuelNorm: parseOptionalNumber(item.fuelNorm),
      leaseRateHour: parseOptionalNumber(item.leaseRateHour),
      plateSerial: item.plateSerial?.trim() || '',
      status,
      statusReason: item.statusReason?.trim() || '',
      remarks: item.remarks?.trim() || '',
      dbType: dbTypeFromEquipmentTypeLabel(item.equipmentType),
    };
  });

  const assetNos = items.map((item) => item.assetNo);
  const internalDupes = assetNos.filter((code, index) => assetNos.indexOf(code) !== index);
  if (internalDupes.length > 0) {
    return jsonError(`Duplicate asset numbers in batch: ${[...new Set(internalDupes)].join(', ')}`);
  }

  const existingRows = await sql`
    SELECT code FROM equipment WHERE project_id = ${projectId}
  `;
  const existingSet = new Set(existingRows.map((row) => row.code.toUpperCase()));
  const conflicts = items.filter((item) => existingSet.has(item.assetNo));
  if (conflicts.length > 0) {
    return jsonError(`Asset numbers already exist: ${conflicts.map((c) => c.assetNo).join(', ')}`);
  }

  let created = 0;
  for (const item of items) {
    const rows = await sql`
      INSERT INTO equipment (
        code, name, type, category, equipment_type_label, make,
        manufacturing_year, fuel_norm, lease_rate_hour,
        project_id, plate_serial, capacity, status,
        status_reason, manager_notes, operator_name, operator_phone, photo,
        added_by_user_id, status_updated_at
      )
      VALUES (
        ${item.assetNo}, ${item.name}, ${item.dbType}::equipment_type,
        ${item.category}, ${item.equipmentType}, ${item.make},
        ${item.manufacturingYear}, ${item.fuelNorm}, ${item.leaseRateHour},
        ${projectId}, ${item.plateSerial}, '',
        ${item.status}::equipment_status,
        ${item.status === 'operational' ? '' : item.statusReason},
        ${item.remarks}, '', '',
        '',
        ${session.user.id}, NOW()
      )
      RETURNING id
    `;
    if (rows[0]) created += 1;
  }

  const codes = items.slice(0, 5).map((i) => i.assetNo).join(', ');
  const more = items.length > 5 ? ` +${items.length - 5} more` : '';
  await writeAuditLog(session, {
    action: AUDIT_ACTION.BULK_CREATED,
    module: AUDIT_MODULE.EQUIPMENT,
    projectId,
    href: auditHref.equipmentProject(projectId),
    summary: `${actorName(session)} bulk-registered ${created} equipment (${codes}${more})`,
  });

  return jsonOk({ created }, 201);
}
