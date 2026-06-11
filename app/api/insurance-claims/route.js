import { sql } from '@/lib/db.js';
import { requireSession, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim, PRIORITY_FROM_UI } from '@/lib/mappers.js';
import { z } from 'zod';

const createSchema = z.object({
  plate: z.string().min(1),
  model: z.string().min(1),
  accidentDescription: z.string().optional(),
  claimNumber: z.string().min(1),
  insuranceProvider: z.string().optional(),
  estimatedCost: z.string().optional(),
  priority: z.string().optional(),
});

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const claims = await sql`SELECT * FROM insurance_claims ORDER BY accident_date DESC`;
  const result = [];
  for (const c of claims) {
    const logs = await sql`SELECT * FROM insurance_progress_logs WHERE claim_id = ${c.id} ORDER BY created_at`;
    result.push(mapInsuranceClaim(c, logs));
  }
  return jsonOk(result);
}

export async function POST(request) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;
  const priority = PRIORITY_FROM_UI[d.priority] || 'normal';
  const rows = await sql`
    INSERT INTO insurance_claims (plate, model, accident_description, claim_number, insurance_provider, estimated_cost, priority)
    VALUES (
      ${d.plate}, ${d.model}, ${d.accidentDescription || ''},
      ${d.claimNumber}, ${d.insuranceProvider || ''}, ${d.estimatedCost || ''},
      ${priority}::priority_level
    )
    RETURNING *
  `;
  await sql`
    INSERT INTO insurance_progress_logs (claim_id, text)
    VALUES (${rows[0].id}, 'Accident reported. Initial claim filed.')
  `;
  const logs = await sql`SELECT * FROM insurance_progress_logs WHERE claim_id = ${rows[0].id} ORDER BY created_at`;
  return jsonOk(mapInsuranceClaim(rows[0], logs), 201);
}
