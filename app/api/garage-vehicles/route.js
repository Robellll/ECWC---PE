import { sql } from '@/lib/db.js';
import { requireSession, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle, PRIORITY_FROM_UI } from '@/lib/mappers.js';
import { z } from 'zod';

const createSchema = z.object({
  plate: z.string().min(1),
  model: z.string().min(1),
  reportedIssue: z.string().optional(),
  technician: z.string().optional(),
  priority: z.string().optional(),
});

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const vehicles = await sql`SELECT * FROM garage_vehicles ORDER BY registered_at DESC`;
  const result = [];
  for (const v of vehicles) {
    const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${v.id} ORDER BY created_at`;
    result.push(mapGarageVehicle(v, logs));
  }
  return jsonOk(result);
}

export async function POST(request) {
  const { error } = await requirePermission((p) => p.isGarageEditor);
  if (error) return error;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;
  const priority = PRIORITY_FROM_UI[d.priority] || 'normal';
  const rows = await sql`
    INSERT INTO garage_vehicles (plate, model, reported_issue, technician, priority)
    VALUES (${d.plate}, ${d.model}, ${d.reportedIssue || ''}, ${d.technician || ''}, ${priority}::priority_level)
    RETURNING *
  `;
  const logText = 'Vehicle received at Central Garage. Initial registration complete.';
  await sql`
    INSERT INTO garage_progress_logs (vehicle_id, text) VALUES (${rows[0].id}, ${logText})
  `;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${rows[0].id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs), 201);
}
