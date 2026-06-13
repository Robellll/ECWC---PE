export const GARAGE_STAGES = ['received', 'under_maintenance', 'final_inspection', 'completed'];
export const INSURANCE_STAGES = ['reported', 'documents_pending', 'inspection', 'approved', 'payout_received', 'closed'];

/** Advance workflow — completion requires separate action with staff validation */
export function nextGarageStage(current) {
  const idx = GARAGE_STAGES.indexOf(current);
  if (idx < 0 || idx >= GARAGE_STAGES.length - 2) return current;
  return GARAGE_STAGES[idx + 1];
}

export function nextInsuranceStage(current) {
  const idx = INSURANCE_STAGES.indexOf(current);
  return INSURANCE_STAGES[Math.min(idx + 1, INSURANCE_STAGES.length - 1)];
}
