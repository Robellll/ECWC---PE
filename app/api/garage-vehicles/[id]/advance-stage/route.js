import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { nextGarageStage } from '@/lib/stages.js';

export async function POST(_request, { params }) {
  const { error } = await requirePermission((p) => p.isGarageEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  const nextStage = nextGarageStage(existing[0].stage);
  const isCompleted = nextStage === 'completed';
  const rows = await sql`
    UPDATE garage_vehicles SET
      stage = ${nextStage}::garage_stage,
      status = ${isCompleted ? 'completed' : 'in_progress'}::garage_status,
      completed_at = ${isCompleted ? new Date().toISOString() : existing[0].completed_at},
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
