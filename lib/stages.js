export const GARAGE_STAGES = ['received', 'under_maintenance', 'final_inspection', 'completed'];
export const PROJECT_GARAGE_STAGES = ['received', 'under_maintenance', 'completed'];
export const INSURANCE_STAGES = [
  'reported_notified',
  'document_pending',
  'insurance_inspection',
  'bid',
  'under_maintenance',
  'completed',
];

/** Advance workflow — completion requires separate action with staff validation */
export function nextGarageStage(current) {
  const idx = GARAGE_STAGES.indexOf(current);
  if (idx < 0 || idx >= GARAGE_STAGES.length - 2) return current;
  return GARAGE_STAGES[idx + 1];
}

export function nextProjectGarageStage(current) {
  const idx = PROJECT_GARAGE_STAGES.indexOf(current);
  if (idx < 0 || idx >= PROJECT_GARAGE_STAGES.length - 2) return current;
  return PROJECT_GARAGE_STAGES[idx + 1];
}

export function nextInsuranceStage(current) {
  const idx = INSURANCE_STAGES.indexOf(current);
  if (idx < 0 || idx >= INSURANCE_STAGES.length - 2) return current;
  return INSURANCE_STAGES[idx + 1];
}
