import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';
import { z } from 'zod';

const updateSchema = z.object({
  policeReport: z.boolean().optional(),
  accidentForm: z.boolean().optional(),
  licenseDoc: z.boolean().optional(),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM insurance_claims WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  if (existing[0].status === 'closed') {
    return jsonError('Cannot update documents on a completed claim', 400);
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const policeReport = parsed.data.policeReport ?? existing[0].police_report;
  const accidentForm = parsed.data.accidentForm ?? existing[0].accident_form;
  const licenseDoc = parsed.data.licenseDoc ?? existing[0].license_doc;

  await sql`
    UPDATE insurance_claims SET
      police_report = ${policeReport},
      accident_form = ${accidentForm},
      license_doc = ${licenseDoc},
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
