import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdDispatch, logProdAudit } from '@/lib/production/mappers.js';
import { z } from 'zod';

const schema = z.object({
  dispatchDate: z.string(),
  projectId: z.string().uuid(),
  materialId: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  vehicle: z.string().optional(),
  driverName: z.string().optional(),
  destination: z.string().optional(),
  deliveryNoteNumber: z.string().optional(),
  remarks: z.string().optional(),
});

export async function PUT(request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid dispatch record');
  const d = parsed.data;

  await sql`
    UPDATE prod_dispatch SET
      dispatch_date = ${d.dispatchDate}::date,
      project_id = ${d.projectId}, material_id = ${d.materialId},
      quantity = ${d.quantity}, unit = ${d.unit},
      vehicle = ${d.vehicle || ''}, driver_name = ${d.driverName || ''},
      destination = ${d.destination || ''},
      delivery_note_number = ${d.deliveryNoteNumber || ''},
      remarks = ${d.remarks || ''},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  const full = await sql`
    SELECT d.*, p.name AS project_name, m.name AS material_name
    FROM prod_dispatch d
    JOIN prod_projects p ON p.id = d.project_id
    JOIN prod_materials m ON m.id = d.material_id
    WHERE d.id = ${id}
  `;
  if (!full[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'dispatch', id, 'update', '');
  return jsonOk(mapProdDispatch(full[0]));
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const rows = await sql`DELETE FROM prod_dispatch WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'dispatch', id, 'delete', '');
  return jsonOk({ ok: true });
}
