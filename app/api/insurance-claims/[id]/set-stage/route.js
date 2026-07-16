import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';
import { validateRepairLocationPayload } from '@/lib/insurance-repair.js';
import { z } from 'zod';

/** Canonical DB keys for UI stage labels (avoid legacy alias collisions). */
const STAGE_UI_TO_DB = {
  'Reported/Notified': 'reported_notified',
  'Document Pending': 'document_pending',
  'Insurance Inspection': 'insurance_inspection',
  Bid: 'bid',
  'Under Maintenance': 'under_maintenance',
};

const STAGE_DB_TO_UI = Object.fromEntries(
  Object.entries(STAGE_UI_TO_DB).map(([ui, db]) => [db, ui]),
);

const SELECTABLE_STAGES = new Set(Object.keys(STAGE_UI_TO_DB));

const bodySchema = z.object({
  stage: z.string().min(1),
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
    return jsonError('Completed claims cannot change stage. Reopen the claim first.', 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const uiStage = parsed.data.stage;
  if (uiStage === 'Completed') {
    return jsonError('Use Mark as Completed to finish a claim', 400);
  }
  if (!SELECTABLE_STAGES.has(uiStage)) {
    return jsonError('Invalid stage', 400);
  }

  const dbStage = STAGE_UI_TO_DB[uiStage];
  if (existing[0].stage === dbStage) {
    return jsonOk(
      mapInsuranceClaim(
        (await sql`
          SELECT c.*, COALESCE(NULLIF(TRIM(c.project_name), ''), p.name, '') AS project_name
          FROM insurance_claims c
          LEFT JOIN projects p ON p.id = c.project_id
          WHERE c.id = ${id}
        `)[0],
        await sql`SELECT * FROM insurance_progress_logs WHERE claim_id = ${id} ORDER BY created_at`,
      ),
    );
  }

  let repairLocation = existing[0].repair_location;
  let outsourceGarageName = existing[0].outsource_garage_name || '';

  if (dbStage === 'under_maintenance') {
    const loc = parsed.data.repairLocation ?? existing[0].repair_location;
    const garage = parsed.data.outsourceGarageName ?? existing[0].outsource_garage_name ?? '';
    const validation = validateRepairLocationPayload(loc, garage);
    if (!validation.ok) return jsonError(validation.error);
    repairLocation = loc;
    outsourceGarageName = repairLocation === 'outsource' ? String(garage).trim() : '';
  }

  if (dbStage === 'under_maintenance') {
    await sql`
      UPDATE insurance_claims SET
        stage = ${dbStage}::insurance_stage,
        repair_location = ${repairLocation}::insurance_repair_location,
        outsource_garage_name = ${outsourceGarageName},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE insurance_claims SET
        stage = ${dbStage}::insurance_stage,
        updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  const label = STAGE_DB_TO_UI[dbStage] || uiStage;
  let logText = `Stage set to ${label}.`;
  if (dbStage === 'under_maintenance') {
    logText += repairLocation === 'central'
      ? ' Repair at Central Garage.'
      : ` Outside repair at ${outsourceGarageName}.`;
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
