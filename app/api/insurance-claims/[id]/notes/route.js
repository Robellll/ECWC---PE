import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';
import { z } from 'zod';

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const parsed = z.object({ notes: z.string() }).safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const rows = await sql`
    UPDATE insurance_claims SET claim_notes = ${parsed.data.notes}, updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return jsonError('Not found', 404);
  const claimRows = await sql`
    SELECT c.*, COALESCE(NULLIF(TRIM(c.project_name), ''), p.name, '') AS project_name
    FROM insurance_claims c
    LEFT JOIN projects p ON p.id = c.project_id
    WHERE c.id = ${id}
  `;
  const logs = await sql`SELECT * FROM insurance_progress_logs WHERE claim_id = ${id} ORDER BY created_at`;
  return jsonOk(mapInsuranceClaim(claimRows[0], logs));
}
