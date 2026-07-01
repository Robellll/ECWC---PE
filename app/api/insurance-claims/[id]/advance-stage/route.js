import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';
import { nextInsuranceStage } from '@/lib/stages.js';
import { INSURANCE_STAGES } from '@/lib/constants.js';
import { validateRepairLocationPayload } from '@/lib/insurance-repair.js';
import { z } from 'zod';

const STAGE_LABELS = Object.fromEntries(
  INSURANCE_STAGES.map((label, i) => {
    const dbKeys = [
      'reported_notified',
      'document_pending',
      'insurance_inspection',
      'bid',
      'under_maintenance',
      'completed',
    ];
    return [dbKeys[i], label];
  }),
);

const bodySchema = z.object({
  repairLocation: z.enum(['central', 'outsource']).optional(),
  outsourceGarageName: z.string().optional(),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM insurance_claims WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  if (existing[0].status === 'closed') {
    return jsonError('Completed claims cannot advance stage', 400);
  }

  const nextStage = nextInsuranceStage(existing[0].stage);
  if (nextStage === existing[0].stage) {
    return jsonError('Claim is already at the maximum advanceable stage', 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  let repairLocation = null;
  let outsourceGarageName = '';

  if (nextStage === 'under_maintenance') {
    const validation = validateRepairLocationPayload(
      parsed.data.repairLocation,
      parsed.data.outsourceGarageName,
    );
    if (!validation.ok) return jsonError(validation.error);
    repairLocation = parsed.data.repairLocation;
    outsourceGarageName = repairLocation === 'outsource'
      ? (parsed.data.outsourceGarageName || '').trim()
      : '';
  }

  if (nextStage === 'under_maintenance') {
    await sql`
      UPDATE insurance_claims SET
        stage = ${nextStage}::insurance_stage,
        repair_location = ${repairLocation}::insurance_repair_location,
        outsource_garage_name = ${outsourceGarageName},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE insurance_claims SET
        stage = ${nextStage}::insurance_stage,
        updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  const label = STAGE_LABELS[nextStage] || nextStage;
  let logText = `Stage advanced to ${label}.`;
  if (nextStage === 'under_maintenance') {
    logText += repairLocation === 'central'
      ? ' Repair at Central Garage.'
      : ` Repair outsourced to ${outsourceGarageName}.`;
  }
  await sql`
    INSERT INTO insurance_progress_logs (claim_id, text)
    VALUES (${id}, ${logText})
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
