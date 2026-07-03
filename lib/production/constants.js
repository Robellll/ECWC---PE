export const PLANT_TYPES = [
  { value: 'aggregate', label: 'Aggregate' },
  { value: 'crusher', label: 'Crusher' },
  { value: 'ready_mix', label: 'Ready Mix' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'sand', label: 'Sand' },
  { value: 'base_course', label: 'Base Course' },
];

export const PLANT_STATUSES = [
  { value: 'running', label: 'Running' },
  { value: 'idle', label: 'Idle' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'out_of_service', label: 'Out of Service' },
];

export const MATERIAL_CATEGORIES = [
  { value: 'aggregate', label: 'Aggregate' },
  { value: 'sand', label: 'Sand' },
  { value: 'base_course', label: 'Base Course' },
  { value: 'ready_mix_concrete', label: 'Ready Mix Concrete' },
  { value: 'asphalt', label: 'Asphalt' },
];

export const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const DEMAND_PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const DEMAND_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_production', label: 'In Production' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const SHIFTS = [
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
  { value: 'full', label: 'Full Day' },
];

export function labelFor(options, value) {
  return options.find((o) => o.value === value)?.label || value || '—';
}

export function plantTypeLabel(v) { return labelFor(PLANT_TYPES, v); }
export function plantStatusLabel(v) { return labelFor(PLANT_STATUSES, v); }
export function materialCategoryLabel(v) { return labelFor(MATERIAL_CATEGORIES, v); }
export function projectStatusLabel(v) { return labelFor(PROJECT_STATUSES, v); }
export function demandPriorityLabel(v) { return labelFor(DEMAND_PRIORITIES, v); }
export function demandStatusLabel(v) { return labelFor(DEMAND_STATUSES, v); }
export function shiftLabel(v) { return labelFor(SHIFTS, v); }

export function demandCompletionPct(requested, produced) {
  const req = Number(requested) || 0;
  const prod = Number(produced) || 0;
  if (req <= 0) return 0;
  return Math.min(100, Math.round((prod / req) * 100));
}

export function stockHealthLevel(current, minLevel) {
  const cur = Number(current) || 0;
  const min = Number(minLevel) || 0;
  if (cur <= 0) return 'critical';
  if (min > 0 && cur <= min) return 'low';
  if (min > 0 && cur <= min * 1.5) return 'warning';
  return 'healthy';
}
