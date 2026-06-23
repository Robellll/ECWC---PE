import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';
import { z } from 'zod';

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const parsed = z.object({ text: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const claim = await sql`SELECT id FROM insurance_claims WHERE id = ${id}`;
  if (!claim[0]) return jsonError('Not found', 404);
  await sql`INSERT INTO insurance_progress_logs (claim_id, text) VALUES (${id}, ${parsed.data.text})`;
  const rows = await sql`
    SELECT c.*, COALESCE(NULLIF(TRIM(c.project_name), ''), p.name, '') AS project_name
    FROM insurance_claims c
    LEFT JOIN projects p ON p.id = c.project_id
    WHERE c.id = ${id}
  `;
  const logs = await sql`SELECT * FROM insurance_progress_logs WHERE claim_id = ${id} ORDER BY created_at`;
  return jsonOk(mapInsuranceClaim(rows[0], logs));
}
