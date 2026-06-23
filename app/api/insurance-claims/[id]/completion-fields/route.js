import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';
import { z } from 'zod';

const updateSchema = z.object({
  finalInspectorName: z.string().optional(),
  compensationAmount: z.union([z.number(), z.string(), z.null()]).optional(),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM insurance_claims WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  if (existing[0].status === 'closed') {
    return jsonError('Cannot update completion fields on a completed claim', 400);
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const finalInspectorName =
    parsed.data.finalInspectorName !== undefined
      ? parsed.data.finalInspectorName.trim()
      : existing[0].final_inspector_name;

  let compensationAmount = existing[0].compensation_amount;
  if (parsed.data.compensationAmount !== undefined) {
    if (parsed.data.compensationAmount === null || parsed.data.compensationAmount === '') {
      compensationAmount = null;
    } else {
      const n = Number(parsed.data.compensationAmount);
      if (!Number.isFinite(n) || n < 0) return jsonError('Invalid compensation amount');
      compensationAmount = n;
    }
  }

  await sql`
    UPDATE insurance_claims SET
      final_inspector_name = ${finalInspectorName},
      compensation_amount = ${compensationAmount},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  const claimRows = await sql`
    SELECT c.*, COALESCE(NULLIF(TRIM(c.project_name), ''), p.name, '') AS project_name
    FROM insurance_claims c
    LEFT JOIN projects p ON p.id = c.project_id
    WHERE c.id = ${id}
  `;
  const logs = await sql`SELECT * FROM insurance_progress_logs WHERE claim_id = ${id} ORDER BY created_at`;
  return jsonOk(mapInsuranceClaim(claimRows[0], logs));
}
