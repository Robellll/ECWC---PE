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

export async function PUT(request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid demand data');
  const d = parsed.data;

  await sql`
    UPDATE prod_demand SET
      project_id = ${d.projectId}, material_id = ${d.materialId},
      requested_quantity = ${d.requestedQuantity}, unit = ${d.unit},
      required_date = ${d.requiredDate}::date,
      priority = ${(d.priority || 'medium')}::prod_demand_priority,
      status = ${(d.status || 'pending')}::prod_demand_status,
      produced_quantity = ${d.producedQuantity ?? 0},
      remarks = ${d.remarks || ''},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  const full = await sql`
    SELECT d.*, p.name AS project_name, m.name AS material_name
    FROM prod_demand d
    JOIN prod_projects p ON p.id = d.project_id
    JOIN prod_materials m ON m.id = d.material_id
    WHERE d.id = ${id}
  `;
  if (!full[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'demand', id, 'update', '');
  return jsonOk(mapProdDemand(full[0]));
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const rows = await sql`DELETE FROM prod_demand WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'demand', id, 'delete', '');
  return jsonOk({ ok: true });
}
