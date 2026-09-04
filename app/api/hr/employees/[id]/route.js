import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapHrEmployee, normalizeHrEmployeeInput } from '@/lib/hr.js';

export async function PUT(request, { params }) {
  const { id } = await params;
  const { error } = await requirePermission((p) => p.canEditHR);
  if (error) return error;

  const [existing] = await sql`SELECT * FROM hr_employees WHERE id = ${id}`;
  if (!existing) return jsonError('Employee not found', 404);

  const body = await request.json().catch(() => ({}));
  const { data, error: invalid } = normalizeHrEmployeeInput(body, existing.workforce);
  if (invalid) return jsonError(invalid);

  const rows = await sql`
    UPDATE hr_employees SET
      employee_no = ${data.employeeNo},
      full_name = ${data.fullName},
      sex = ${data.sex},
      job_title = ${data.jobTitle},
      job_title_key = ${data.jobTitleKey},
      grade = ${data.grade},
      salary = ${data.salary},
      desert_allowance = ${data.desertAllowance},
      food_allowance = ${data.foodAllowance},
      total_pay = ${data.totalPay},
      department = ${data.department},
      work_location = ${data.workLocation},
      employee_type = ${data.employeeType},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return jsonOk(mapHrEmployee(rows[0]));
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error } = await requirePermission((p) => p.canEditHR);
  if (error) return error;

  const rows = await sql`DELETE FROM hr_employees WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return jsonError('Employee not found', 404);

  return jsonOk({ ok: true });
}
