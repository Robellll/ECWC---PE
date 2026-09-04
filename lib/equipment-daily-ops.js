/** Daily Operations Log calculations (from sample fleet Excel). */

export const STANDARD_SHIFT_HOURS = 8;

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function round1(value) {
  return Math.round(num(value) * 10) / 10;
}

export function round2(value) {
  return Math.round(num(value) * 100) / 100;
}

export function calcDailyOpsMetrics({
  operableHr = 0,
  idleHr = 0,
  downHr = 0,
  fuelNorm = null,
  actualFuel = null,
  leaseRateHour = null,
}) {
  const operable = Math.max(0, num(operableHr));
  const idle = Math.max(0, num(idleHr));
  const down = Math.max(0, num(downHr));
  const norm = fuelNorm == null || fuelNorm === '' ? null : num(fuelNorm);
  const actual = actualFuel == null || actualFuel === '' ? null : num(actualFuel);
  const rate = leaseRateHour == null || leaseRateHour === '' ? null : num(leaseRateHour);

  const availableBase = operable + down;
  const availabilityPct = availableBase > 0
    ? round1((operable / availableBase) * 100)
    : 0;
  const utilizationPct = STANDARD_SHIFT_HOURS > 0
    ? round1((operable / STANDARD_SHIFT_HOURS) * 100)
    : 0;
  const downPct = availableBase > 0
    ? round1((down / availableBase) * 100)
    : 0;
  const idlePctOfOperable = operable > 0
    ? round1((idle / operable) * 100)
    : null;

  const expectedFuel = norm == null ? null : round2(norm * operable);
  const fuelVariance = (actual == null || expectedFuel == null)
    ? null
    : round2(actual - expectedFuel);
  const fuelVariancePct = (fuelVariance == null || !expectedFuel)
    ? null
    : round1((fuelVariance / expectedFuel) * 100);

  const totalRevenue = rate == null ? null : round2(operable * rate);

  return {
    operableHr: operable,
    idleHr: idle,
    downHr: down,
    availabilityPct,
    utilizationPct,
    downPct,
    idlePctOfOperable,
    fuelNorm: norm,
    actualFuel: actual,
    expectedFuel,
    fuelVariance,
    fuelVariancePct,
    leaseRateHour: rate,
    totalRevenue,
  };
}

export function validateDailyOpsInput(body) {
  const operable = num(body.operableHr);
  const idle = num(body.idleHr);
  const down = num(body.downHr);
  if (operable < 0 || idle < 0 || down < 0) {
    return 'Hours cannot be negative';
  }
  if (operable + idle + down <= 0) {
    return 'Enter at least one hour value (operable, idle, or down)';
  }
  if (down > 0 && !String(body.reasonDown || '').trim()) {
    return 'Reason for Down is required when Down hours are greater than 0';
  }
  if (idle > 0 && !String(body.reasonIdle || '').trim()) {
    return 'Reason for Idle is required when Idle hours are greater than 0';
  }
  return null;
}

export function mapDailyOpsRow(row) {
  if (!row) return null;
  const metrics = calcDailyOpsMetrics({
    operableHr: row.operable_hr,
    idleHr: row.idle_hr,
    downHr: row.down_hr,
    fuelNorm: row.fuel_norm,
    actualFuel: row.actual_fuel,
    leaseRateHour: row.lease_rate_hour,
  });

  return {
    id: row.id,
    projectId: row.project_id,
    equipmentId: row.equipment_id,
    opsDate: row.ops_date,
    assetNo: row.asset_no || row.code || '',
    assetName: row.asset_name || row.name || '',
    category: row.category || '',
    equipmentType: row.equipment_type_label || '',
    reasonDown: row.reason_down || '',
    reasonIdle: row.reason_idle || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...metrics,
  };
}

/** Aggregate daily rows into Utilization + OID metrics for one asset (or fleet). */
export function calcPeriodOpsSummary({
  operableHr = 0,
  idleHr = 0,
  downHr = 0,
  daysLogged = 0,
}) {
  const operable = Math.max(0, num(operableHr));
  const idle = Math.max(0, num(idleHr));
  const down = Math.max(0, num(downHr));
  const days = Math.max(0, Math.floor(num(daysLogged)));
  const totalOid = operable + idle + down;
  const availableBase = operable + down;
  const plannedHr = days * STANDARD_SHIFT_HOURS;

  return {
    operableHr: round2(operable),
    idleHr: round2(idle),
    downHr: round2(down),
    totalOidHr: round2(totalOid),
    daysLogged: days,
    plannedHr: round2(plannedHr),
    utilizationPct: plannedHr > 0
      ? round1((operable / plannedHr) * 100)
      : 0,
    availabilityPct: availableBase > 0
      ? round1((operable / availableBase) * 100)
      : 0,
    operablePct: totalOid > 0 ? round1((operable / totalOid) * 100) : 0,
    idlePct: totalOid > 0 ? round1((idle / totalOid) * 100) : 0,
    downPct: totalOid > 0 ? round1((down / totalOid) * 100) : 0,
  };
}

export function mapPeriodOpsSummaryRow(row) {
  if (!row) return null;
  const metrics = calcPeriodOpsSummary({
    operableHr: row.operable_hr,
    idleHr: row.idle_hr,
    downHr: row.down_hr,
    daysLogged: row.days_logged,
  });

  return {
    equipmentId: row.equipment_id,
    assetNo: row.asset_no || row.code || '',
    assetName: row.asset_name || row.name || '',
    category: row.category || '',
    equipmentType: row.equipment_type_label || '',
    ...metrics,
  };
}
