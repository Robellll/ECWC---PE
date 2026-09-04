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

const createSchema = z.object({
  equipmentId: z.string().uuid(),
  opsDate: z.string().min(8),
  operableHr: z.union([z.number(), z.string()]).optional(),
  idleHr: z.union([z.number(), z.string()]).optional(),
  downHr: z.union([z.number(), z.string()]).optional(),
  reasonDown: z.string().optional(),
  reasonIdle: z.string().optional(),
  actualFuel: z.union([z.number(), z.string()]).optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { error } = await requireEquipmentProjectAccess(projectId, 'view');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const equipmentId = searchParams.get('equipmentId');
  const date = searchParams.get('date');

  let rows;
  if (equipmentId && date) {
    rows = await sql`
      SELECT o.*, e.code AS asset_no, e.name AS asset_name,
        e.category, e.equipment_type_label
      FROM equipment_daily_ops o
      JOIN equipment e ON e.id = o.equipment_id
      WHERE o.project_id = ${projectId}
        AND o.equipment_id = ${equipmentId}
        AND o.ops_date = ${date}::date
      LIMIT 1
    `;
  } else if (from && to) {
    rows = await sql`
      SELECT o.*, e.code AS asset_no, e.name AS asset_name,
        e.category, e.equipment_type_label
      FROM equipment_daily_ops o
      JOIN equipment e ON e.id = o.equipment_id
      WHERE o.project_id = ${projectId}
        AND o.ops_date >= ${from}::date
        AND o.ops_date <= ${to}::date
      ORDER BY o.ops_date DESC, e.code ASC
    `;
  } else if (date) {
    rows = await sql`
      SELECT o.*, e.code AS asset_no, e.name AS asset_name,
        e.category, e.equipment_type_label
      FROM equipment_daily_ops o
      JOIN equipment e ON e.id = o.equipment_id
      WHERE o.project_id = ${projectId}
        AND o.ops_date = ${date}::date
      ORDER BY e.code ASC
    `;
  } else {
    rows = await sql`
      SELECT o.*, e.code AS asset_no, e.name AS asset_name,
        e.category, e.equipment_type_label
      FROM equipment_daily_ops o
      JOIN equipment e ON e.id = o.equipment_id
      WHERE o.project_id = ${projectId}
      ORDER BY o.ops_date DESC, e.code ASC
      LIMIT 200
    `;
  }

  const mapped = rows.map(mapDailyOpsRow);
  const totals = mapped.reduce((acc, row) => {
    acc.operableHr += row.operableHr;
    acc.idleHr += row.idleHr;
    acc.downHr += row.downHr;
    acc.actualFuel += row.actualFuel || 0;
    acc.totalRevenue += row.totalRevenue || 0;
    return acc;
  }, { operableHr: 0, idleHr: 0, downHr: 0, actualFuel: 0, totalRevenue: 0 });

  return jsonOk({
    rows: mapped,
    totals: {
      operableHr: Math.round(totals.operableHr * 100) / 100,
      idleHr: Math.round(totals.idleHr * 100) / 100,
      downHr: Math.round(totals.downHr * 100) / 100,
      actualFuel: Math.round(totals.actualFuel * 100) / 100,
      totalRevenue: Math.round(totals.totalRevenue * 100) / 100,
      count: mapped.length,
    },
  });
}

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { session, error } = await requireEquipmentProjectAccess(projectId, 'edit');
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;

  const inputError = validateDailyOpsInput(d);
  if (inputError) return jsonError(inputError);

  const [equipment] = await sql`
    SELECT * FROM equipment
    WHERE id = ${d.equipmentId} AND project_id = ${projectId}
    LIMIT 1
  `;
  if (!equipment) return jsonError('Equipment not found in this project', 404);

  const metrics = calcDailyOpsMetrics({
    operableHr: d.operableHr,
    idleHr: d.idleHr,
    downHr: d.downHr,
    fuelNorm: equipment.fuel_norm,
    actualFuel: d.actualFuel,
    leaseRateHour: equipment.lease_rate_hour,
  });

  const rows = await sql`
    INSERT INTO equipment_daily_ops (
      project_id, equipment_id, ops_date,
      operable_hr, idle_hr, down_hr,
      reason_down, reason_idle,
      fuel_norm, actual_fuel, lease_rate_hour,
      notes, created_by
    ) VALUES (
      ${projectId}, ${d.equipmentId}, ${d.opsDate}::date,
      ${metrics.operableHr}, ${metrics.idleHr}, ${metrics.downHr},
      ${metrics.downHr > 0 ? (d.reasonDown || '').trim() : ''},
      ${metrics.idleHr > 0 ? (d.reasonIdle || '').trim() : ''},
      ${metrics.fuelNorm}, ${metrics.actualFuel}, ${metrics.leaseRateHour},
      ${(d.notes || '').trim()}, ${session.user.id}
    )
    ON CONFLICT (equipment_id, ops_date) DO UPDATE SET
      operable_hr = EXCLUDED.operable_hr,
      idle_hr = EXCLUDED.idle_hr,
      down_hr = EXCLUDED.down_hr,
      reason_down = EXCLUDED.reason_down,
      reason_idle = EXCLUDED.reason_idle,
      fuel_norm = EXCLUDED.fuel_norm,
      actual_fuel = EXCLUDED.actual_fuel,
      lease_rate_hour = EXCLUDED.lease_rate_hour,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *
  `;

  const full = await sql`
    SELECT o.*, e.code AS asset_no, e.name AS asset_name,
      e.category, e.equipment_type_label
    FROM equipment_daily_ops o
    JOIN equipment e ON e.id = o.equipment_id
    WHERE o.id = ${rows[0].id}
  `;

  await writeAuditLog(session, {
    action: AUDIT_ACTION.CREATED,
    module: AUDIT_MODULE.EQUIPMENT,
    entityId: rows[0].id,
    projectId,
    href: `/equipment/${projectId}/operations`,
    summary: `${actorName(session)} logged daily ops for ${equipment.code} on ${d.opsDate}`,
  });

  return jsonOk(mapDailyOpsRow(full[0]), 201);
}
