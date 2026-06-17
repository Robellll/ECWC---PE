import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { isValidMaintenanceType } from '@/lib/garage.js';
import { z } from 'zod';

const schema = z.object({
  maintenanceType: z.enum(['major', 'minor']),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isGarageEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const { maintenanceType } = parsed.data;
  if (!isValidMaintenanceType(maintenanceType)) {
    return jsonError('Maintenance type must be Major or Minor', 400);
  }

  const rows = await sql`
    UPDATE garage_vehicles SET
      maintenance_type = ${maintenanceType}::garage_maintenance_type,
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;

  if (existing[0].maintenance_type !== maintenanceType) {
    const label = maintenanceType === 'major' ? 'Major' : 'Minor';
    await sql`
      INSERT INTO garage_progress_logs (vehicle_id, text)
      VALUES (${id}, ${`Maintenance type updated to ${label}.`})
    `;
  }

  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
