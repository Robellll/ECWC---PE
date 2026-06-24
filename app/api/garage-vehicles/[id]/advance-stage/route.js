import { sql } from '@/lib/db.js';
import { requireGarageVehicleAccess, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { vehicleScope } from '@/lib/garage-access.js';
import { nextGarageStage, nextProjectGarageStage } from '@/lib/stages.js';

const STAGE_LABELS = {
  received: 'Received',
  under_maintenance: 'Under Maintenance',
  final_inspection: 'Final Inspection',
  completed: 'Completed',
};

export async function POST(_request, { params }) {
  const { id } = await params;
  const { error, vehicle: existing } = await requireGarageVehicleAccess(id, 'edit');
  if (error) return error;
  if (existing.status === 'completed') {
    return jsonError('Completed vehicles cannot advance stage', 400);
  }

  const scope = vehicleScope(existing);
  const nextStage = scope === 'project'
    ? nextProjectGarageStage(existing.stage)
    : nextGarageStage(existing.stage);

  if (nextStage === existing.stage) {
    return jsonError('Vehicle is already at the maximum advanceable stage', 400);
  }

  const rows = await sql`
    UPDATE garage_vehicles SET
      stage = ${nextStage}::garage_stage,
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  const label = STAGE_LABELS[nextStage] || nextStage;
  await sql`
    INSERT INTO garage_progress_logs (vehicle_id, text)
    VALUES (${id}, ${`Stage advanced to ${label}.`})
  `;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
