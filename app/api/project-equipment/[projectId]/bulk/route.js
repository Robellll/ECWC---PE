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

const bulkItemSchema = z.object({
  assetNo: z.string().min(1),
  plateSerial: z.string().min(1),
  model: z.string().min(1),
  status: z.string().optional(),
  operatorName: z.string().optional(),
  operatorPhone: z.string().optional(),
  capacity: z.string().optional(),
  remarks: z.string().optional(),
});

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { session, error } = await requireEquipmentProjectAccess(projectId, 'edit');
  if (error) return error;

  const body = await request.json();
  const parsed = z.object({ items: z.array(bulkItemSchema).min(1) }).safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const items = parsed.data.items.map((item) => ({
    assetNo: item.assetNo.trim().toUpperCase(),
    plateSerial: item.plateSerial.trim(),
    model: item.model.trim(),
    status: EQUIPMENT_STATUS_FROM_UI[item.status] || 'operational',
    operatorName: item.operatorName?.trim() || '',
    operatorPhone: item.operatorPhone?.trim() || '',
    capacity: item.capacity?.trim() || '',
    remarks: item.remarks?.trim() || '',
  }));

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
        code, name, type, project_id, plate_serial, capacity, status,
        manager_notes, operator_name, operator_phone, photo,
        added_by_user_id, status_updated_at
      )
      VALUES (
        ${item.assetNo}, ${item.model}, 'other'::equipment_type,
        ${projectId}, ${item.plateSerial}, ${item.capacity},
        ${item.status}::equipment_status,
        ${item.remarks}, ${item.operatorName}, ${item.operatorPhone},
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
