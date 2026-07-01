import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { fetchInsuranceClaimWithLogs } from '@/lib/insurance-claims.js';
import { validateRepairLocationPayload } from '@/lib/insurance-repair.js';
import { z } from 'zod';

const schema = z.object({
  repairLocation: z.enum(['central', 'outsource']),
  outsourceGarageName: z.string().optional(),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM insurance_claims WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  if (existing[0].status === 'closed') {
    return jsonError('Completed claims cannot change repair location', 400);
  }
  if (existing[0].stage !== 'under_maintenance') {
    return jsonError('Repair location applies to Under Maintenance claims only', 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid repair location');

  const { repairLocation, outsourceGarageName = '' } = parsed.data;
  const validation = validateRepairLocationPayload(repairLocation, outsourceGarageName);
  if (!validation.ok) return jsonError(validation.error);

  const garageName = repairLocation === 'outsource' ? outsourceGarageName.trim() : '';

  await sql`
    UPDATE insurance_claims SET
      repair_location = ${repairLocation}::insurance_repair_location,
      outsource_garage_name = ${garageName},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  const label = repairLocation === 'central'
    ? 'Central Garage'
    : `Outsource — ${garageName}`;
  await sql`
    INSERT INTO insurance_progress_logs (claim_id, text)
    VALUES (${id}, ${`Repair location set to ${label}.`})
  `;

  const claim = await fetchInsuranceClaimWithLogs(id);
  return jsonOk(claim);
}
