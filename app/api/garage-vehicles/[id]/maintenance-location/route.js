import { sql } from '@/lib/db.js';
import { requireGarageVehicleAccess, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { vehicleScope } from '@/lib/garage-access.js';
import {
  validateMaintenanceLocationPayload,
  maintenanceLocationLogLabel,
} from '@/lib/maintenance-location.js';
import { z } from 'zod';

const schema = z.object({
  maintenanceLocation: z.enum(['on_site', 'central', 'outsource']),
  outsourceGarageName: z.string().optional(),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { error, vehicle: existing } = await requireGarageVehicleAccess(id, 'edit');
  if (error) return error;
  if (existing.status === 'completed') {
    return jsonError('Completed records cannot change maintenance location', 400);
  }
  if (existing.stage !== 'under_maintenance') {
    return jsonError('Maintenance location applies to Under Maintenance jobs only', 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid maintenance location');

  const scope = vehicleScope(existing);
  const { maintenanceLocation, outsourceGarageName = '' } = parsed.data;
  const validation = validateMaintenanceLocationPayload(
    maintenanceLocation,
    outsourceGarageName,
    scope,
  );
  if (!validation.ok) return jsonError(validation.error);

  const garageName = maintenanceLocation === 'outsource' ? outsourceGarageName.trim() : '';

  await sql`
    UPDATE garage_vehicles SET
      maintenance_location = ${maintenanceLocation}::garage_maintenance_location,
      outsource_garage_name = ${garageName},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  const label = maintenanceLocationLogLabel(maintenanceLocation, garageName, scope);
  await sql`
    INSERT INTO garage_progress_logs (vehicle_id, text)
    VALUES (${id}, ${`Maintenance location set to ${label}.`})
  `;

  const rows = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
