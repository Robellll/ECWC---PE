import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdMaterial, logProdAudit } from '@/lib/production/mappers.js';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  category: z.enum(['aggregate', 'sand', 'base_course', 'ready_mix_concrete', 'asphalt']),
  unit: z.string().min(1),
  description: z.string().optional(),
  minStockLevel: z.number().min(0).optional(),
});

export async function PUT(request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid material data');

  const { name, category, unit, description = '', minStockLevel = 0 } = parsed.data;
  const rows = await sql`
    UPDATE prod_materials SET
      name = ${name},
      category = ${category}::prod_material_category,
      unit = ${unit},
      description = ${description},
      min_stock_level = ${minStockLevel},
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'material', id, 'update', name);
  return jsonOk(mapProdMaterial(rows[0]));
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const rows = await sql`DELETE FROM prod_materials WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'material', id, 'delete', '');
  return jsonOk({ ok: true });
}
