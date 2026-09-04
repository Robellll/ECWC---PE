import { sql } from '@/lib/db.js';
import {
  requireEquipmentProjectAccess,
  jsonOk,
  jsonError,
} from '@/lib/api-helpers.js';
import {
  calcDailyOpsMetrics,
  mapDailyOpsRow,
  validateDailyOpsInput,
} from '@/lib/equipment-daily-ops.js';
import {
  writeAuditLog, AUDIT_ACTION, AUDIT_MODULE, actorName,
} from '@/lib/audit-log.js';
import { z } from 'zod';

const updateSchema = z.object({
  operableHr: z.union([z.number(), z.string()]).optional(),
  idleHr: z.union([z.number(), z.string()]).optional(),
  downHr: z.union([z.number(), z.string()]).optional(),
  reasonDown: z.string().optional(),
  reasonIdle: z.string().optional(),
  actualFuel: z.union([z.number(), z.string()]).optional().nullable(),
  notes: z.string().optional(),
  opsDate: z.string().optional(),
});

export async function PUT(request, { params }) {
  const { projectId, id } = await params;
  const { session, error } = await requireEquipmentProjectAccess(projectId, 'edit');
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;

  const [existing] = await sql`
    SELECT o.*, e.fuel_norm AS asset_fuel_norm, e.lease_rate_hour AS asset_lease_rate,
      e.code AS asset_no
    FROM equipment_daily_ops o
    JOIN equipment e ON e.id = o.equipment_id
    WHERE o.id = ${id} AND o.project_id = ${projectId}
    LIMIT 1
  `;
  if (!existing) return jsonError('Not found', 404);

  const merged = {
    operableHr: d.operableHr !== undefined ? d.operableHr : existing.operable_hr,
    idleHr: d.idleHr !== undefined ? d.idleHr : existing.idle_hr,
    downHr: d.downHr !== undefined ? d.downHr : existing.down_hr,
    reasonDown: d.reasonDown !== undefined ? d.reasonDown : existing.reason_down,
    reasonIdle: d.reasonIdle !== undefined ? d.reasonIdle : existing.reason_idle,
    actualFuel: d.actualFuel !== undefined ? d.actualFuel : existing.actual_fuel,
    notes: d.notes !== undefined ? d.notes : existing.notes,
  };

  const inputError = validateDailyOpsInput(merged);
  if (inputError) return jsonError(inputError);

  const metrics = calcDailyOpsMetrics({
    operableHr: merged.operableHr,
    idleHr: merged.idleHr,
    downHr: merged.downHr,
    fuelNorm: existing.asset_fuel_norm,
    actualFuel: merged.actualFuel,
    leaseRateHour: existing.asset_lease_rate,
  });

  const opsDate = d.opsDate || existing.ops_date;

  await sql`
    UPDATE equipment_daily_ops SET
      ops_date = ${opsDate}::date,
      operable_hr = ${metrics.operableHr},
      idle_hr = ${metrics.idleHr},
      down_hr = ${metrics.downHr},
      reason_down = ${metrics.downHr > 0 ? String(merged.reasonDown || '').trim() : ''},
      reason_idle = ${metrics.idleHr > 0 ? String(merged.reasonIdle || '').trim() : ''},
      fuel_norm = ${metrics.fuelNorm},
      actual_fuel = ${metrics.actualFuel},
      lease_rate_hour = ${metrics.leaseRateHour},
      notes = ${String(merged.notes || '').trim()},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  const full = await sql`
    SELECT o.*, e.code AS asset_no, e.name AS asset_name,
      e.category, e.equipment_type_label
    FROM equipment_daily_ops o
    JOIN equipment e ON e.id = o.equipment_id
    WHERE o.id = ${id}
  `;

  await writeAuditLog(session, {
    action: AUDIT_ACTION.UPDATED,
    module: AUDIT_MODULE.EQUIPMENT,
    entityId: id,
    projectId,
    href: `/equipment/${projectId}/operations`,
    summary: `${actorName(session)} updated daily ops for ${existing.asset_no}`,
  });

  return jsonOk(mapDailyOpsRow(full[0]));
}

export async function DELETE(_request, { params }) {
  const { projectId, id } = await params;
  const { session, error } = await requireEquipmentProjectAccess(projectId, 'edit');
  if (error) return error;

  const rows = await sql`
    DELETE FROM equipment_daily_ops
    WHERE id = ${id} AND project_id = ${projectId}
    RETURNING id, equipment_id
  `;
  if (!rows[0]) return jsonError('Not found', 404);

  await writeAuditLog(session, {
    action: AUDIT_ACTION.DELETED,
    module: AUDIT_MODULE.EQUIPMENT,
    entityId: id,
    projectId,
    href: `/equipment/${projectId}/operations`,
    summary: `${actorName(session)} deleted a daily operations log entry`,
  });

  return jsonOk({ ok: true });
}
