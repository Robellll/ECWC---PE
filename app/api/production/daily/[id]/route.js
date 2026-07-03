import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdDaily, logProdAudit } from '@/lib/production/mappers.js';
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
});

export async function PUT(request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid production record');
  const d = parsed.data;

  await sql`
    UPDATE prod_daily_production SET
      production_date = ${d.productionDate}::date,
      plant_id = ${d.plantId}, material_id = ${d.materialId},
      quantity_produced = ${d.quantityProduced}, unit = ${d.unit},
      shift = ${(d.shift || 'day')}::prod_shift,
      operator_name = ${d.operatorName || ''},
      remarks = ${d.remarks || ''},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  const full = await sql`
    SELECT p.*, pl.name AS plant_name, m.name AS material_name
    FROM prod_daily_production p
    JOIN prod_plants pl ON pl.id = p.plant_id
    JOIN prod_materials m ON m.id = p.material_id
    WHERE p.id = ${id}
  `;
  if (!full[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'daily_production', id, 'update', '');
  return jsonOk(mapProdDaily(full[0]));
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const rows = await sql`DELETE FROM prod_daily_production WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'daily_production', id, 'delete', '');
  return jsonOk({ ok: true });
}
