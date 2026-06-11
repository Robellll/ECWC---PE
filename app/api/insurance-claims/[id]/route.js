import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  await sql`DELETE FROM insurance_claims WHERE id = ${id}`;
  return jsonOk({ success: true });
}
