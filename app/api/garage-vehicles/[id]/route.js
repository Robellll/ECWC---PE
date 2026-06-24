import { sql } from '@/lib/db.js';
import { requireGarageVehicleAccess, jsonOk } from '@/lib/api-helpers.js';

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error } = await requireGarageVehicleAccess(id, 'edit');
  if (error) return error;
  await sql`DELETE FROM garage_vehicles WHERE id = ${id}`;
  return jsonOk({ success: true });
}
