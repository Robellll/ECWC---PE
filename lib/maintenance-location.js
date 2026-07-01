export const CENTRAL_LOCATION_OPTIONS = [
  { value: 'central', label: 'Central' },
  { value: 'outsource', label: 'Outsource' },
];

export const PROJECT_LOCATION_OPTIONS = [
  { value: 'on_site', label: 'On Site' },
  { value: 'outsource', label: 'Outsource' },
  { value: 'central', label: 'Central' },
];

export function maintenanceLocationLabel(value) {
  if (value === 'central') return 'Central';
  if (value === 'outsource') return 'Outsource';
  if (value === 'on_site') return 'On Site';
  return '—';
}

export function formatMaintenanceLocationSummary(vehicle) {
  if (!vehicle?.maintenanceLocation) return '—';
  if (vehicle.maintenanceLocation === 'central') {
    return vehicle.garageScope === 'project' ? 'Central' : 'Central';
  }
  if (vehicle.maintenanceLocation === 'on_site') return 'On Site';
  const name = (vehicle.outsourceGarageName || '').trim();
  return name ? `Outsource — ${name}` : 'Outsource';
}

export function isValidMaintenanceLocation(location, outsourceGarageName = '', scope = 'central') {
  if (scope === 'project') {
    if (location === 'on_site' || location === 'central') return true;
    if (location === 'outsource') return (outsourceGarageName || '').trim().length >= 2;
    return false;
  }
  if (location === 'central') return true;
  if (location === 'outsource') return (outsourceGarageName || '').trim().length >= 2;
  return false;
}

export function validateMaintenanceLocationPayload(location, outsourceGarageName, scope = 'central') {
  if (!location) {
    return { ok: false, error: 'Select where maintenance will be performed' };
  }
  if (scope === 'project') {
    if (!['on_site', 'outsource', 'central'].includes(location)) {
      return { ok: false, error: 'Invalid maintenance location' };
    }
  } else if (!['central', 'outsource'].includes(location)) {
    return { ok: false, error: 'Select Central or Outsource' };
  }
  if (location === 'outsource' && !isValidMaintenanceLocation('outsource', outsourceGarageName, scope)) {
    return { ok: false, error: 'Outsource garage name is required (at least 2 characters)' };
  }
  return { ok: true };
}

export function maintenanceLocationLogLabel(location, outsourceGarageName, scope) {
  if (location === 'central') {
    return scope === 'project' ? 'Maintenance at Central Garage' : 'Maintenance in Central Garage';
  }
  if (location === 'on_site') return 'Maintenance on project site';
  return `Outsourced to ${(outsourceGarageName || '').trim()}`;
}
