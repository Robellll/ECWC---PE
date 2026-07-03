import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdDispatch, logProdAudit } from '@/lib/production/mappers.js';
import {
  assertDispatchStock, recordDispatchStock,
} from '@/lib/production/stock.js';
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

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;
  const rows = await sql`
    SELECT d.*, p.name AS project_name, m.name AS material_name
    FROM prod_dispatch d
    JOIN prod_projects p ON p.id = d.project_id
    JOIN prod_materials m ON m.id = d.material_id
    ORDER BY d.dispatch_date DESC, d.created_at DESC
  `;
  return jsonOk(rows.map(mapProdDispatch));
}

export async function POST(request) {
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid dispatch record');

  const d = parsed.data;
  const stockCheck = await assertDispatchStock(d.materialId, d.quantity);
  if (!stockCheck.ok) return jsonError(stockCheck.error);

  const rows = await sql`
    INSERT INTO prod_dispatch (
      dispatch_date, project_id, material_id, quantity, unit,
      vehicle, driver_name, destination, delivery_note_number, remarks, created_by
    ) VALUES (
      ${d.dispatchDate}::date, ${d.projectId}, ${d.materialId},
      ${d.quantity}, ${d.unit},
      ${d.vehicle || ''}, ${d.driverName || ''},
      ${d.destination || ''}, ${d.deliveryNoteNumber || ''},
      ${d.remarks || ''}, ${session.user.id}
    ) RETURNING *
  `;

  await recordDispatchStock(
    d.materialId,
    d.quantity,
    rows[0].id,
    `Dispatch ${d.dispatchDate}`,
  );

  await logProdAudit(session.user.id, 'dispatch', rows[0].id, 'create', '');
  const full = await sql`
    SELECT d.*, p.name AS project_name, m.name AS material_name
    FROM prod_dispatch d
    JOIN prod_projects p ON p.id = d.project_id
    JOIN prod_materials m ON m.id = d.material_id
    WHERE d.id = ${rows[0].id}
  `;
  return jsonOk(mapProdDispatch(full[0]), 201);
}
