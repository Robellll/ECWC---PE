import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';

export async function POST(_request, { params }) {
  const { error } = await requirePermission((p) => p.isGarageEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  const isCompleted = existing[0].status === 'completed';
  const rows = await sql`
    UPDATE garage_vehicles SET
      status = ${isCompleted ? 'in_progress' : 'completed'}::garage_status,
      stage = ${isCompleted ? 'in_repair' : 'completed'}::garage_stage,
      completed_at = ${isCompleted ? null : new Date().toISOString()},
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
