import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { z } from 'zod';

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isGarageEditor);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const parsed = z.object({ text: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const vehicle = await sql`SELECT id FROM garage_vehicles WHERE id = ${id}`;
  if (!vehicle[0]) return jsonError('Not found', 404);
  await sql`INSERT INTO garage_progress_logs (vehicle_id, text) VALUES (${id}, ${parsed.data.text})`;
  const rows = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
