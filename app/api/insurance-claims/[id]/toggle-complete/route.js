import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';
import { isValidStaffName, isValidCompensation } from '@/lib/insurance.js';
import { z } from 'zod';

const completeSchema = z.object({
  finalInspectorName: z.string().optional(),
  compensationAmount: z.union([z.number(), z.string()]).optional(),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM insurance_claims WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);

  const isCompleted = existing[0].status === 'closed';

  if (isCompleted) {
    await sql`
      UPDATE insurance_claims SET
        status = 'open'::insurance_status,
        stage = 'under_maintenance'::insurance_stage,
        completed_at = NULL,
        updated_at = NOW()
      WHERE id = ${id}
    `;
    await sql`
      INSERT INTO insurance_progress_logs (claim_id, text)
      VALUES (${id}, 'Claim reopened for further processing.')
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

  if (existing[0].stage !== 'under_maintenance') {
    return jsonError('Claim must be at Under Maintenance stage before completion', 400);
  }
  if (!existing[0].repair_location) {
    return jsonError('Repair location (Central or Outside) must be set before completion', 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const finalInspectorName = (parsed.data.finalInspectorName || existing[0].final_inspector_name || '').trim();
  const compensationRaw = parsed.data.compensationAmount ?? existing[0].compensation_amount;

  if (!isValidStaffName(finalInspectorName)) {
    return jsonError('Final Inspector Name is required before completion', 400);
  }
  if (!isValidCompensation(compensationRaw)) {
    return jsonError('Compensation Amount is required before completion', 400);
  }

  const compensationAmount = Number(compensationRaw);

  await sql`
    UPDATE insurance_claims SET
      final_inspector_name = ${finalInspectorName},
      compensation_amount = ${compensationAmount},
      status = 'closed'::insurance_status,
      stage = 'completed'::insurance_stage,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id}
  `;
  await sql`
    INSERT INTO insurance_progress_logs (claim_id, text)
    VALUES (
      ${id},
      ${`Claim completed. Final inspection by ${finalInspectorName}. Compensation: ${compensationAmount.toLocaleString('en-ET')} ETB.`}
    )
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
