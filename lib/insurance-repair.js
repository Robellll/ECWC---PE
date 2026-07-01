export const REPAIR_LOCATIONS = [
  { value: 'central', label: 'Central' },
  { value: 'outsource', label: 'Outsource' },
];

export function repairLocationLabel(value) {
  if (value === 'central') return 'Central';
  if (value === 'outsource') return 'Outsource';
  return '—';
}

export function formatRepairLocationSummary(claim) {
  if (!claim?.repairLocation) return '—';
  if (claim.repairLocation === 'central') return 'Central';
  const name = (claim.outsourceGarageName || '').trim();
  return name ? `Outsource — ${name}` : 'Outsource';
}

export function isValidRepairLocation(repairLocation, outsourceGarageName = '') {
  if (repairLocation === 'central') return true;
  if (repairLocation === 'outsource') {
    return (outsourceGarageName || '').trim().length >= 2;
  }
  return false;
}

export function validateRepairLocationPayload(repairLocation, outsourceGarageName) {
  if (!repairLocation) {
    return { ok: false, error: 'Select Central or Outsource repair location' };
  }
  if (repairLocation === 'outsource' && !isValidRepairLocation('outsource', outsourceGarageName)) {
    return { ok: false, error: 'Outsource garage name is required (at least 2 characters)' };
  }
  return { ok: true };
}
