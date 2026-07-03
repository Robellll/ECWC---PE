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

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;
  const rows = await sql`SELECT * FROM prod_materials ORDER BY name`;
  return jsonOk(rows.map(mapProdMaterial));
}

export async function POST(request) {
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid material data');

  const { name, category, unit, description = '', minStockLevel = 0 } = parsed.data;
  const rows = await sql`
    INSERT INTO prod_materials (name, category, unit, description, min_stock_level)
    VALUES (${name}, ${category}::prod_material_category, ${unit}, ${description}, ${minStockLevel})
    RETURNING *
  `;
  await logProdAudit(session.user.id, 'material', rows[0].id, 'create', name);
  return jsonOk(mapProdMaterial(rows[0]), 201);
}
