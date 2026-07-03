import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdDemand, logProdAudit } from '@/lib/production/mappers.js';
import { z } from 'zod';

const schema = z.object({
  projectId: z.string().uuid(),
  materialId: z.string().uuid(),
  requestedQuantity: z.number().positive(),
  unit: z.string().min(1),
  requiredDate: z.string(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['pending', 'in_production', 'completed', 'cancelled']).optional(),
  producedQuantity: z.number().min(0).optional(),
  remarks: z.string().optional(),
});

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;
  const rows = await sql`
    SELECT d.*, p.name AS project_name, m.name AS material_name
    FROM prod_demand d
    JOIN prod_projects p ON p.id = d.project_id
    JOIN prod_materials m ON m.id = d.material_id
    ORDER BY d.required_date DESC, d.created_at DESC
  `;
  return jsonOk(rows.map(mapProdDemand));
}

export async function POST(request) {
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid demand data');
  const d = parsed.data;

  const rows = await sql`
    INSERT INTO prod_demand (
      project_id, material_id, requested_quantity, unit,
      required_date, priority, status, produced_quantity, remarks
    ) VALUES (
      ${d.projectId}, ${d.materialId}, ${d.requestedQuantity}, ${d.unit},
      ${d.requiredDate}::date, ${(d.priority || 'medium')}::prod_demand_priority,
      ${(d.status || 'pending')}::prod_demand_status,
      ${d.producedQuantity || 0}, ${d.remarks || ''}
    ) RETURNING *
  `;
  const full = await sql`
    SELECT d.*, p.name AS project_name, m.name AS material_name
    FROM prod_demand d
    JOIN prod_projects p ON p.id = d.project_id
    JOIN prod_materials m ON m.id = d.material_id
    WHERE d.id = ${rows[0].id}
  `;
  await logProdAudit(session.user.id, 'demand', rows[0].id, 'create', '');
  return jsonOk(mapProdDemand(full[0]), 201);
}
