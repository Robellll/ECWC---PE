/** Central Garage workshops and UI helpers */

export const GARAGE_WORKSHOPS = [
  { value: 'auxiliary_equipment', label: 'Auxiliary Equipment Maintenance Shop', color: '#0ea5e9' },
  { value: 'electrical_electronics', label: 'Electrical & Electronics Maintenance Shop', color: '#8b5cf6' },
  { value: 'electromechanical', label: 'Electromechanical Maintenance Shop', color: '#6366f1' },
  { value: 'engine', label: 'Engine Maintenance Shop', color: '#f97316' },
  { value: 'factory_equipment', label: 'Factory Equipment Maintenance Shop', color: '#14b8a6' },
  { value: 'heavy_machinery', label: 'Heavy Machinery Maintenance Shop', color: '#eab308' },
  { value: 'heavy_vehicle', label: 'Heavy Vehicle Maintenance Shop', color: '#f59e0b' },
  { value: 'light_vehicle', label: 'Light Vehicle Maintenance Shop', color: '#22c55e' },
  { value: 'service_wash_grease_tire', label: 'Service, Wash & Grease and Tire Repair Shop', color: '#06b6d4' },
  { value: 'vehicle_body_painting', label: 'Vehicle Body Painting & Assembly Maintenance Shop', color: '#ec4899' },
];

export const WORKSHOP_BY_VALUE = Object.fromEntries(GARAGE_WORKSHOPS.map((w) => [w.value, w]));

export function workshopLabel(value) {
  return WORKSHOP_BY_VALUE[value]?.label || value || '—';
}

export function workshopColor(value) {
  return WORKSHOP_BY_VALUE[value]?.color || '#6b7280';
}

export function isValidStaffName(name) {
  const trimmed = (name || '').trim();
  return trimmed.length >= 2;
}
