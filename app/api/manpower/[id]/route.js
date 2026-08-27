import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapManpowerStaff } from '@/lib/manpower.js';
import { z } from 'zod';

const updateSchema = z.object({
  employeeId: z.string().min(1).optional(),
  fullName: z.string().min(2).optional(),
  jobTitle: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const { error } = await requirePermission((p) => p.canEditManpower);
  if (error) return error;
  const { id } = await params;

  const existing = await sql`SELECT * FROM manpower_staff WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);

  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;

  const employeeId = d.employeeId !== undefined ? d.employeeId.trim() : existing[0].employee_id;
  const fullName = d.fullName !== undefined ? d.fullName.trim() : existing[0].full_name;
  const jobTitle = d.jobTitle !== undefined ? d.jobTitle.trim() : existing[0].job_title;
  const notes = d.notes !== undefined ? d.notes.trim() : existing[0].notes;
  const isActive = d.isActive !== undefined ? d.isActive : existing[0].is_active;

  try {
    const rows = await sql`
      UPDATE manpower_staff SET
        employee_id = ${employeeId},
        full_name = ${fullName},
        job_title = ${jobTitle || ''},
        notes = ${notes || ''},
        is_active = ${isActive},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return jsonOk(mapManpowerStaff(rows[0]));
  } catch (err) {
    if (String(err?.message || '').includes('unique') || err?.code === '23505') {
      return jsonError('Employee ID already exists', 409);
    }
    throw err;
  }
}

/**
 * Soft status flip only — never hard-deletes the staff row.
 * Active → inactive, inactive → active.
 */
export async function DELETE(_request, { params }) {
  const { error } = await requirePermission((p) => p.canEditManpower);
  if (error) return error;
  const { id } = await params;

  const existing = await sql`SELECT * FROM manpower_staff WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);

  const nextActive = !existing[0].is_active;
  const rows = await sql`
    UPDATE manpower_staff
    SET is_active = ${nextActive}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return jsonOk(mapManpowerStaff(rows[0]));
}
