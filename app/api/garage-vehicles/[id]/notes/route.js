import { sql } from '@/lib/db.js';
import { requireGarageVehicleAccess, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { z } from 'zod';

export async function POST(request, { params }) {
  const { id } = await params;
  const { error } = await requireGarageVehicleAccess(id, 'edit');
  if (error) return error;
  const body = await request.json();
  const parsed = z.object({ notes: z.string() }).safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const rows = await sql`
    UPDATE garage_vehicles SET manager_notes = ${parsed.data.notes}, updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return jsonError('Not found', 404);
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
