import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission((p) => p.isGarageEditor);
  if (error) return error;
  const { id } = await params;
  await sql`DELETE FROM garage_vehicles WHERE id = ${id}`;
  return jsonOk({ success: true });
}
