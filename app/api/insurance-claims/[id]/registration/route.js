import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { validateAccidentPhoto } from '@/lib/insurance.js';
import { fetchInsuranceClaimWithLogs } from '@/lib/insurance-claims.js';
import { z } from 'zod';

const updateSchema = z.object({
  vehicleType: z.string().min(1),
  plate: z.string().min(1),
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
  clearPhoto: z.boolean().optional(),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM insurance_claims WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const d = parsed.data;
  if (d.accidentType === 'other' && !(d.accidentTypeOther || '').trim()) {
    return jsonError('Please specify the accident type when "Other" is selected');
  }

  const accidentDate = new Date(d.accidentDate);
  if (Number.isNaN(accidentDate.getTime())) return jsonError('Invalid accident date');

  let photoValue = existing[0].accident_photo;
  if (d.clearPhoto) {
    photoValue = null;
  } else if (d.accidentPhoto !== undefined && d.accidentPhoto !== null) {
    const photoCheck = validateAccidentPhoto(d.accidentPhoto);
    if (!photoCheck.ok) return jsonError(photoCheck.error);
    photoValue = photoCheck.value;
  }

  await sql`
    UPDATE insurance_claims SET
      plate = ${d.plate.trim()},
      vehicle_type = ${d.vehicleType.trim()},
      project_name = ${d.projectName.trim()},
      driver_operator = ${d.driverOperator.trim()},
      accident_date = ${accidentDate.toISOString()},
      police_report = ${Boolean(d.policeReport)},
      accident_form = ${Boolean(d.accidentForm)},
      license_doc = ${Boolean(d.licenseDoc)},
      accident_type = ${d.accidentType}::accident_type,
      accident_type_other = ${d.accidentType === 'other' ? (d.accidentTypeOther || '').trim() : ''},
      accident_description = ${d.accidentDescription.trim()},
      accident_photo = ${photoValue},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  await sql`
    INSERT INTO insurance_progress_logs (claim_id, text)
    VALUES (${id}, 'Registration details updated.')
  `;

  const mapped = await fetchInsuranceClaimWithLogs(id);
  return jsonOk(mapped);
}
