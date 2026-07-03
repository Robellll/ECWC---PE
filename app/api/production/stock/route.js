import { requirePermission, jsonOk } from '@/lib/api-helpers.js';
import { getAllStockBalances } from '@/lib/production/stock.js';
import { stockHealthLevel } from '@/lib/production/constants.js';

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;
  const balances = await getAllStockBalances();
  return jsonOk(balances.map((b) => ({
    ...b,
    health: stockHealthLevel(b.currentStock, b.minStockLevel),
  })));
}
