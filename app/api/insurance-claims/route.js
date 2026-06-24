import { sql } from '@/lib/db.js';
import { requireSession, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { validateAccidentPhoto } from '@/lib/insurance.js';
import { fetchInsuranceClaimWithLogs } from '@/lib/insurance-claims.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';
import { z } from 'zod';

const createSchema = z.object({
  vehicleType: z.string().min(1),
  plate: z.string().min(1),
  projectId: z.string().uuid().nullable().optional(),
  projectName: z.string().min(1),
  driverOperator: z.string().min(1),
  accidentDate: z.string().min(1),
  policeReport: z.boolean().optional(),
  accidentForm: z.boolean().optional(),
  licenseDoc: z.boolean().optional(),
  accidentType: z.enum(['collision', 'rollover', 'other']),
  accidentTypeOther: z.string().optional(),
  accidentDescription: z.string().min(1),
  accidentPhoto: z.string().nullable().optional(),
});

async function fetchClaimWithLogs(id) {
  return fetchInsuranceClaimWithLogs(id);
}

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const claims = await sql`
    SELECT c.*, COALESCE(NULLIF(TRIM(c.project_name), ''), p.name, '') AS project_name
    FROM insurance_claims c
    LEFT JOIN projects p ON p.id = c.project_id
    ORDER BY c.accident_date DESC
  `;
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
  const photoCheck = validateAccidentPhoto(d.accidentPhoto);
  if (!photoCheck.ok) return jsonError(photoCheck.error);

  if (d.accidentType === 'other' && !(d.accidentTypeOther || '').trim()) {
    return jsonError('Please specify the accident type when "Other" is selected');
  }

  const accidentDate = new Date(d.accidentDate);
  if (Number.isNaN(accidentDate.getTime())) return jsonError('Invalid accident date');

  const rows = await sql`
    INSERT INTO insurance_claims (
      plate, vehicle_type, project_id, project_name, driver_operator, accident_date,
      police_report, accident_form, license_doc,
      accident_type, accident_type_other, accident_description, accident_photo
    )
    VALUES (
      ${d.plate.trim()},
      ${d.vehicleType.trim()},
      NULL,
      ${d.projectName.trim()},
      ${d.driverOperator.trim()},
      ${accidentDate.toISOString()},
      ${Boolean(d.policeReport)},
      ${Boolean(d.accidentForm)},
      ${Boolean(d.licenseDoc)},
      ${d.accidentType}::accident_type,
      ${d.accidentType === 'other' ? (d.accidentTypeOther || '').trim() : ''},
      ${d.accidentDescription.trim()},
      ${photoCheck.value}
    )
    RETURNING *
  `;

  await sql`
    INSERT INTO insurance_progress_logs (claim_id, text)
    VALUES (${rows[0].id}, 'Accident reported and claim registered.')
  `;

  const mapped = await fetchClaimWithLogs(rows[0].id);
  return jsonOk(mapped, 201);
}
