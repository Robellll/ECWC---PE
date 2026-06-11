export const GARAGE_STAGES = ['received', 'diagnosing', 'in_repair', 'testing', 'completed'];
export const INSURANCE_STAGES = ['reported', 'documents_pending', 'inspection', 'approved', 'payout_received', 'closed'];

export function nextGarageStage(current) {
  const idx = GARAGE_STAGES.indexOf(current);
  return GARAGE_STAGES[Math.min(idx + 1, GARAGE_STAGES.length - 1)];
}

export function nextInsuranceStage(current) {
  const idx = INSURANCE_STAGES.indexOf(current);
  return INSURANCE_STAGES[Math.min(idx + 1, INSURANCE_STAGES.length - 1)];
}
