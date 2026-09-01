export const PLANT_DOWN_REASONS = [
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'heavy_repair', label: 'Heavy Repair' },
  { value: 'under_installation', label: 'Under Installation' },
  { value: 'waiting_for_installation', label: 'Waiting for Installation' },
  { value: 'under_dismantling', label: 'Under Dismantling' },
  { value: 'under_insurance', label: 'Under Insurance' },
];

export const PLANT_DOWN_REASON_VALUES = PLANT_DOWN_REASONS.map((o) => o.value);

export function requiresPlantDownReason(status) {
  return status === 'down';
}

export function plantDownReasonLabel(value) {
  return PLANT_DOWN_REASONS.find((o) => o.value === value)?.label || value || '—';
}

export function validatePlantStatus(status, statusReason) {
  if (status === 'down') {
    if (!statusReason || !PLANT_DOWN_REASON_VALUES.includes(statusReason)) {
      return { ok: false, error: 'Select a down reason' };
    }
  }
  return { ok: true, statusReason: status === 'down' ? statusReason : '' };
}

export function plantStatusDisplayLabel(status, statusReason) {
  if (status === 'down' && statusReason) {
    return `Down — ${plantDownReasonLabel(statusReason)}`;
  }
  if (status === 'operable') return 'Operable';
  if (status === 'idle') return 'Idle';
  if (status === 'down') return 'Down';
  return status || '—';
}
