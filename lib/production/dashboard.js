import { sql } from '@/lib/db.js';
import { getAllStockBalances } from './stock.js';
import { stockHealthLevel } from './constants.js';
import { PLANT_DOWN_REASONS, plantDownReasonLabel } from './plant-status.js';

export async function fetchProductionDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const [
    plantStats,
    todayProduction,
    stockRows,
    demandStats,
    todayDispatch,
    dailyTrend,
    productionByMaterial,
    demandVsProduction,
    plantPerformance,
    monthlyProduction,
    lowStock,
    overdueDemands,
    idlePlants,
    downPlants,
    downBreakdownRows,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'operable')::int AS operable,
        COUNT(*) FILTER (WHERE status = 'idle')::int AS idle,
        COUNT(*) FILTER (WHERE status = 'down')::int AS down
      FROM prod_plants
    `,
    sql`
      SELECT COALESCE(SUM(quantity_produced), 0)::numeric AS total
      FROM prod_daily_production WHERE production_date = ${today}::date
    `,
    getAllStockBalances(),
    sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'in_production')::int AS in_production
      FROM prod_demand
    `,
    sql`
      SELECT COALESCE(SUM(quantity), 0)::numeric AS total
      FROM prod_dispatch WHERE dispatch_date = ${today}::date
    `,
    sql`
      SELECT production_date::text AS date, COALESCE(SUM(quantity_produced), 0)::numeric AS total
      FROM prod_daily_production
      WHERE production_date >= (CURRENT_DATE - INTERVAL '14 days')
      GROUP BY production_date ORDER BY production_date
    `,
    sql`
      SELECT m.name, COALESCE(SUM(p.quantity_produced), 0)::numeric AS total
      FROM prod_daily_production p
      JOIN prod_materials m ON m.id = p.material_id
      WHERE p.production_date >= (CURRENT_DATE - INTERVAL '30 days')
      GROUP BY m.name ORDER BY total DESC LIMIT 8
    `,
    sql`
      SELECT m.name,
        COALESCE((SELECT SUM(d.requested_quantity) FROM prod_demand d WHERE d.material_id = m.id AND d.status != 'cancelled'), 0)::numeric AS demanded,
        COALESCE((SELECT SUM(t.quantity) FROM prod_stock_transactions t WHERE t.material_id = m.id AND t.transaction_type = 'production'), 0)::numeric AS produced
      FROM prod_materials m ORDER BY m.name LIMIT 8
    `,
    sql`
      SELECT pl.name, COALESCE(SUM(p.quantity_produced), 0)::numeric AS total,
        pl.capacity, pl.status
      FROM prod_plants pl
      LEFT JOIN prod_daily_production p ON p.plant_id = pl.id
        AND p.production_date >= (CURRENT_DATE - INTERVAL '30 days')
      GROUP BY pl.id, pl.name, pl.capacity, pl.status
      ORDER BY total DESC LIMIT 8
    `,
    sql`
      SELECT to_char(production_date, 'YYYY-MM') AS month,
        COALESCE(SUM(quantity_produced), 0)::numeric AS total
      FROM prod_daily_production
      WHERE production_date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY 1 ORDER BY 1
    `,
    sql`
      SELECT m.name, m.unit, m.min_stock_level,
        COALESCE(SUM(t.quantity), 0)::numeric AS current_stock
      FROM prod_materials m
      LEFT JOIN prod_stock_transactions t ON t.material_id = m.id
      GROUP BY m.id, m.name, m.unit, m.min_stock_level
      HAVING COALESCE(SUM(t.quantity), 0) <= m.min_stock_level AND m.min_stock_level > 0
      ORDER BY current_stock ASC LIMIT 10
    `,
    sql`
      SELECT d.id, p.name AS project_name, m.name AS material_name,
        d.requested_quantity, d.required_date, d.status
      FROM prod_demand d
      JOIN prod_projects p ON p.id = d.project_id
      JOIN prod_materials m ON m.id = d.material_id
      WHERE d.status IN ('pending', 'in_production')
        AND d.required_date < CURRENT_DATE
      ORDER BY d.required_date ASC LIMIT 10
    `,
    sql`
      SELECT name, code, status_changed_at
      FROM prod_plants
      WHERE status = 'idle'
        AND status_changed_at < (NOW() - INTERVAL '2 days')
      ORDER BY status_changed_at ASC LIMIT 10
    `,
    sql`
      SELECT name, code, status_reason, status_changed_at
      FROM prod_plants WHERE status = 'down'
      ORDER BY status_changed_at DESC LIMIT 10
    `,
    sql`
      SELECT status_reason, COUNT(*)::int AS count
      FROM prod_plants
      WHERE status = 'down'
      GROUP BY status_reason
    `,
  ]);

  const totalStock = stockRows.reduce((s, r) => s + r.currentStock, 0);
  const avgDaily = dailyTrend.length
    ? dailyTrend.reduce((s, r) => s + Number(r.total), 0) / dailyTrend.length
    : 0;
  const operablePlants = plantStats[0]?.operable || 0;
  const totalPlants = plantStats[0]?.total || 0;
  const plantUtilization = totalPlants ? Math.round((operablePlants / totalPlants) * 100) : 0;

  const downBreakdown = PLANT_DOWN_REASONS.map((r) => {
    const row = downBreakdownRows.find((d) => d.status_reason === r.value);
    return { reason: r.value, label: r.label, count: row?.count || 0 };
  }).filter((r) => r.count > 0);

  const completedDemands = demandStats[0]?.completed || 0;
  const totalDemands = (demandStats[0]?.pending || 0)
    + (demandStats[0]?.completed || 0)
    + (demandStats[0]?.in_production || 0);
  const demandFulfillment = totalDemands
    ? Math.round((completedDemands / totalDemands) * 100)
    : 0;

  const stockByMaterial = stockRows.map((s) => ({
    name: s.materialName,
    total: s.currentStock,
    health: stockHealthLevel(s.currentStock, s.minStockLevel),
  }));

  const alerts = [
    ...lowStock.map((r) => ({
      type: 'low_stock',
      severity: 'warning',
      message: `Low stock: ${r.name} (${Number(r.current_stock).toFixed(1)} ${r.unit})`,
    })),
    ...overdueDemands.map((r) => ({
      type: 'overdue_demand',
      severity: 'critical',
      message: `Overdue demand: ${r.project_name} — ${r.material_name} (due ${r.required_date})`,
    })),
    ...idlePlants.map((r) => ({
      type: 'idle_plant',
      severity: 'info',
      message: `Idle plant: ${r.name} (${r.code})`,
    })),
    ...downPlants.map((r) => ({
      type: 'down_plant',
      severity: 'warning',
      message: `Down: ${r.name} (${r.code}) — ${plantDownReasonLabel(r.status_reason)}`,
    })),
  ];

  const topPlants = [...plantPerformance]
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, 5)
    .map((r) => ({ name: r.name, total: Number(r.total) }));

  const topProjects = await sql`
    SELECT p.name, COALESCE(SUM(d.quantity), 0)::numeric AS total
    FROM prod_dispatch d
    JOIN prod_projects p ON p.id = d.project_id
    WHERE d.dispatch_date >= (CURRENT_DATE - INTERVAL '30 days')
    GROUP BY p.name ORDER BY total DESC LIMIT 5
  `;

  return {
    kpis: {
      totalPlants: plantStats[0]?.total || 0,
      operablePlants,
      activePlants: operablePlants,
      idlePlants: plantStats[0]?.idle || 0,
      downPlants: plantStats[0]?.down || 0,
      todayProduction: Number(todayProduction[0]?.total || 0),
      currentStock: totalStock,
      pendingDemand: demandStats[0]?.pending || 0,
      completedDemand: demandStats[0]?.completed || 0,
      todayDispatch: Number(todayDispatch[0]?.total || 0),
    },
    intelligence: {
      demandFulfillmentPct: demandFulfillment,
      plantUtilizationPct: plantUtilization,
      averageDailyProduction: Math.round(avgDaily * 10) / 10,
      currentInventory: totalStock,
      productionEfficiency: plantUtilization,
      dispatchTotal30d: topProjects.reduce((s, r) => s + Number(r.total), 0),
      topProducingPlants: topPlants,
      topConsumingProjects: topProjects.map((r) => ({
        name: r.name,
        total: Number(r.total),
      })),
    },
    charts: {
      dailyTrend: dailyTrend.map((r) => ({
        date: r.date,
        total: Number(r.total),
      })),
      productionByMaterial: productionByMaterial.map((r) => ({
        name: r.name,
        total: Number(r.total),
      })),
      stockByMaterial,
      demandVsProduction: demandVsProduction.map((r) => ({
        name: r.name,
        demanded: Number(r.demanded),
        produced: Number(r.produced),
      })),
      plantPerformance: plantPerformance.map((r) => ({
        name: r.name,
        total: Number(r.total),
        capacity: Number(r.capacity),
        status: r.status,
      })),
      monthlyProduction: monthlyProduction.map((r) => ({
        month: r.month,
        total: Number(r.total),
      })),
    },
    plantStatus: {
      operable: operablePlants,
      idle: plantStats[0]?.idle || 0,
      down: plantStats[0]?.down || 0,
      downBreakdown,
    },
    alerts,
  };
}
