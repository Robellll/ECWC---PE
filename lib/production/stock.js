import { sql } from '@/lib/db.js';
import { demandCompletionPct } from './constants.js';

export async function getMaterialStockBalance(materialId) {
  const rows = await sql`
    SELECT COALESCE(SUM(quantity), 0)::numeric AS balance
    FROM prod_stock_transactions
    WHERE material_id = ${materialId}
  `;
  return Number(rows[0]?.balance || 0);
}

export async function getAllStockBalances() {
  const rows = await sql`
    SELECT
      m.id,
      m.name,
      m.unit,
      m.min_stock_level,
      COALESCE(SUM(t.quantity), 0)::numeric AS current_stock,
      MAX(t.created_at) AS last_updated
    FROM prod_materials m
    LEFT JOIN prod_stock_transactions t ON t.material_id = m.id
    GROUP BY m.id, m.name, m.unit, m.min_stock_level
    ORDER BY m.name
  `;

  const reservedRows = await sql`
    SELECT
      material_id,
      COALESCE(SUM(GREATEST(requested_quantity - produced_quantity, 0)), 0)::numeric AS reserved
    FROM prod_demand
    WHERE status IN ('pending', 'in_production')
    GROUP BY material_id
  `;
  const reservedMap = Object.fromEntries(
    reservedRows.map((r) => [r.material_id, Number(r.reserved)]),
  );

  return rows.map((r) => {
    const currentStock = Number(r.current_stock);
    const reserved = reservedMap[r.id] || 0;
    return {
      materialId: r.id,
      materialName: r.name,
      unit: r.unit,
      minStockLevel: Number(r.min_stock_level),
      currentStock,
      reservedQuantity: reserved,
      availableQuantity: Math.max(0, currentStock - reserved),
      lastUpdated: r.last_updated,
    };
  });
}

export async function assertDispatchStock(materialId, quantity) {
  const balances = await getAllStockBalances();
  const row = balances.find((b) => b.materialId === materialId);
  const available = row?.availableQuantity ?? 0;
  if (Number(quantity) > available) {
    return {
      ok: false,
      error: `Insufficient stock. Available: ${available.toFixed(2)} ${row?.unit || ''}`,
      available,
    };
  }
  return { ok: true, available };
}

export async function recordProductionStock(materialId, quantity, referenceId, notes = '') {
  await sql`
    INSERT INTO prod_stock_transactions (material_id, transaction_type, quantity, reference_id, notes)
    VALUES (${materialId}, 'production'::prod_stock_tx_type, ${quantity}, ${referenceId}, ${notes})
  `;
}

export async function recordDispatchStock(materialId, quantity, referenceId, notes = '') {
  await sql`
    INSERT INTO prod_stock_transactions (material_id, transaction_type, quantity, reference_id, notes)
    VALUES (${materialId}, 'dispatch'::prod_stock_tx_type, ${-Math.abs(Number(quantity))}, ${referenceId}, ${notes})
  `;
}

export async function syncDemandProduced(materialId, projectId, additionalQty) {
  const demands = await sql`
    SELECT * FROM prod_demand
    WHERE material_id = ${materialId}
      AND project_id = ${projectId}
      AND status IN ('pending', 'in_production')
    ORDER BY required_date ASC, created_at ASC
  `;
  let remaining = Number(additionalQty);
  for (const d of demands) {
    if (remaining <= 0) break;
    const gap = Number(d.requested_quantity) - Number(d.produced_quantity);
    if (gap <= 0) continue;
    const add = Math.min(gap, remaining);
    const newProduced = Number(d.produced_quantity) + add;
    const pct = demandCompletionPct(d.requested_quantity, newProduced);
    const newStatus = pct >= 100 ? 'completed' : 'in_production';
    await sql`
      UPDATE prod_demand SET
        produced_quantity = ${newProduced},
        status = ${newStatus}::prod_demand_status,
        updated_at = NOW()
      WHERE id = ${d.id}
    `;
    remaining -= add;
  }
}
