import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';

export async function GET(request) {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'daily';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const projectId = searchParams.get('projectId');
  const plantId = searchParams.get('plantId');
  const materialId = searchParams.get('materialId');
  const region = searchParams.get('region');

  let rows = [];

  if (type === 'daily' || type === 'weekly' || type === 'monthly') {
    rows = await sql`
      SELECT p.production_date::text AS date, pl.name AS plant, m.name AS material,
        p.quantity_produced AS quantity, p.unit, p.operator_name AS operator
      FROM prod_daily_production p
      JOIN prod_plants pl ON pl.id = p.plant_id
      JOIN prod_materials m ON m.id = p.material_id
      WHERE (${from}::date IS NULL OR p.production_date >= ${from}::date)
        AND (${to}::date IS NULL OR p.production_date <= ${to}::date)
        AND (${plantId}::uuid IS NULL OR p.plant_id = ${plantId}::uuid)
        AND (${materialId}::uuid IS NULL OR p.material_id = ${materialId}::uuid)
      ORDER BY p.production_date DESC
    `;
  } else if (type === 'plant-performance') {
    rows = await sql`
      SELECT pl.name AS plant, pl.status,
        COALESCE(SUM(p.quantity_produced), 0)::numeric AS total, pl.capacity, pl.unit
      FROM prod_plants pl
      LEFT JOIN prod_daily_production p ON p.plant_id = pl.id
        AND (${from}::date IS NULL OR p.production_date >= ${from}::date)
        AND (${to}::date IS NULL OR p.production_date <= ${to}::date)
      GROUP BY pl.id, pl.name, pl.status, pl.capacity, pl.unit
      ORDER BY total DESC
    `;
  } else if (type === 'stock-balance') {
    rows = await sql`
      SELECT m.name AS material, m.unit,
        COALESCE(SUM(t.quantity), 0)::numeric AS current_stock
      FROM prod_materials m
      LEFT JOIN prod_stock_transactions t ON t.material_id = m.id
      GROUP BY m.id, m.name, m.unit ORDER BY m.name
    `;
  } else if (type === 'dispatch-history') {
    rows = await sql`
      SELECT d.dispatch_date::text AS date, pr.name AS project, m.name AS material,
        d.quantity, d.unit, d.vehicle, d.driver_name, d.delivery_note_number
      FROM prod_dispatch d
      JOIN prod_projects pr ON pr.id = d.project_id
      JOIN prod_materials m ON m.id = d.material_id
      WHERE (${from}::date IS NULL OR d.dispatch_date >= ${from}::date)
        AND (${to}::date IS NULL OR d.dispatch_date <= ${to}::date)
        AND (${projectId}::uuid IS NULL OR d.project_id = ${projectId}::uuid)
        AND (${materialId}::uuid IS NULL OR d.material_id = ${materialId}::uuid)
        AND (${region}::text IS NULL OR pr.region = ${region})
      ORDER BY d.dispatch_date DESC
    `;
  } else if (type === 'demand-vs-production') {
    rows = await sql`
      SELECT m.name AS material,
        COALESCE(SUM(dem.requested_quantity), 0)::numeric AS demanded,
        COALESCE(SUM(dem.produced_quantity), 0)::numeric AS produced
      FROM prod_materials m
      LEFT JOIN prod_demand dem ON dem.material_id = m.id AND dem.status != 'cancelled'
      GROUP BY m.id, m.name ORDER BY m.name
    `;
  } else if (type === 'project-supply') {
    rows = await sql`
      SELECT pr.name AS project, pr.region, m.name AS material,
        COALESCE(SUM(d.quantity), 0)::numeric AS dispatched
      FROM prod_dispatch d
      JOIN prod_projects pr ON pr.id = d.project_id
      JOIN prod_materials m ON m.id = d.material_id
      WHERE (${from}::date IS NULL OR d.dispatch_date >= ${from}::date)
        AND (${to}::date IS NULL OR d.dispatch_date <= ${to}::date)
        AND (${projectId}::uuid IS NULL OR d.project_id = ${projectId}::uuid)
        AND (${region}::text IS NULL OR pr.region = ${region})
      GROUP BY pr.name, pr.region, m.name ORDER BY dispatched DESC
    `;
  }

  return jsonOk({ type, rows });
}
