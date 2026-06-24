import { sql } from '@/lib/db.js';
import { mapGarageVehicle } from '@/lib/mappers.js';

export async function fetchGarageVehicleWithLogs(id) {
  const rows = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  if (!rows[0]) return null;
  const logs = await sql`
    SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at
  `;
  return mapGarageVehicle(rows[0], logs);
}

export async function fetchProjectGarageVehicles(projectId) {
  const vehicles = await sql`
    SELECT * FROM garage_vehicles
    WHERE garage_scope = 'project' AND project_id = ${projectId}
    ORDER BY registered_at DESC
  `;
  const result = [];
  for (const v of vehicles) {
    const logs = await sql`
      SELECT * FROM garage_progress_logs WHERE vehicle_id = ${v.id} ORDER BY created_at
    `;
    result.push(mapGarageVehicle(v, logs));
  }
  return result;
}
