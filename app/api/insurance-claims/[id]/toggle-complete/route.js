import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';

export async function POST(_request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM insurance_claims WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  const isClosed = existing[0].status === 'closed';
  const rows = await sql`
    UPDATE insurance_claims SET
      status = ${isClosed ? 'open' : 'closed'}::insurance_status,
      stage = ${isClosed ? 'approved' : 'closed'}::insurance_stage,
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  const logs = await sql`SELECT * FROM insurance_progress_logs WHERE claim_id = ${id} ORDER BY created_at`;
  return jsonOk(mapInsuranceClaim(rows[0], logs));
}
