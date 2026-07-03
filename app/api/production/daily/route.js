import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdDaily, logProdAudit } from '@/lib/production/mappers.js';
import {
  recordProductionStock, syncDemandProduced,
} from '@/lib/production/stock.js';
import { z } from 'zod';

const schema = z.object({
  productionDate: z.string(),
  plantId: z.string().uuid(),
  materialId: z.string().uuid(),
  quantityProduced: z.number().positive(),
  unit: z.string().min(1),
  shift: z.enum(['day', 'night', 'full']).optional(),
  operatorName: z.string().optional(),
  remarks: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;
  const rows = await sql`
    SELECT p.*, pl.name AS plant_name, m.name AS material_name
    FROM prod_daily_production p
    JOIN prod_plants pl ON pl.id = p.plant_id
    JOIN prod_materials m ON m.id = p.material_id
    ORDER BY p.production_date DESC, p.created_at DESC
  `;
  return jsonOk(rows.map(mapProdDaily));
}

export async function POST(request) {
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid production record');

  const d = parsed.data;
  const rows = await sql`
    INSERT INTO prod_daily_production (
      production_date, plant_id, material_id, quantity_produced, unit,
      shift, operator_name, remarks, created_by
    ) VALUES (
      ${d.productionDate}::date, ${d.plantId}, ${d.materialId},
      ${d.quantityProduced}, ${d.unit},
      ${(d.shift || 'day')}::prod_shift,
      ${d.operatorName || ''}, ${d.remarks || ''}, ${session.user.id}
    ) RETURNING *
  `;

  await recordProductionStock(
    d.materialId,
    d.quantityProduced,
    rows[0].id,
    `Daily production ${d.productionDate}`,
  );

  let projectId = d.projectId;
  if (!projectId) {
    const plant = await sql`SELECT assigned_project_id FROM prod_plants WHERE id = ${d.plantId}`;
    projectId = plant[0]?.assigned_project_id;
  }
  if (projectId) {
    await syncDemandProduced(d.materialId, projectId, d.quantityProduced);
  }

  await logProdAudit(session.user.id, 'daily_production', rows[0].id, 'create', '');
  const full = await sql`
    SELECT p.*, pl.name AS plant_name, m.name AS material_name
    FROM prod_daily_production p
    JOIN prod_plants pl ON pl.id = p.plant_id
    JOIN prod_materials m ON m.id = p.material_id
    WHERE p.id = ${rows[0].id}
  `;
  return jsonOk(mapProdDaily(full[0]), 201);
}
