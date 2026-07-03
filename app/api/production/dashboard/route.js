import { requirePermission, jsonOk } from '@/lib/api-helpers.js';
import { fetchProductionDashboard } from '@/lib/production/dashboard.js';

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;
  const data = await fetchProductionDashboard();
  return jsonOk(data);
}
