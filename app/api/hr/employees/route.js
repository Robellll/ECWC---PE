import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapHrEmployee, normalizeHrEmployeeInput, WORKFORCES } from '@/lib/hr.js';

const PAGE_SIZE = 5000;

export async function GET(request) {
  const { error } = await requirePermission((p) => p.canViewHR);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('workforce') || 'all';
  const workforce = WORKFORCES.includes(requested) ? requested : 'all';

  const rows = workforce === 'all'
    ? await sql`
      SELECT * FROM hr_employees
      WHERE is_active
      ORDER BY workforce, full_name
      LIMIT ${PAGE_SIZE}
    `
    : await sql`
      SELECT * FROM hr_employees
      WHERE is_active AND workforce = ${workforce}
      ORDER BY full_name
      LIMIT ${PAGE_SIZE}
    `;

  const employees = rows.map(mapHrEmployee);

  return jsonOk({
    workforce,
    total: employees.length,
    employees,
    departments: [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    locations: [...new Set(employees.map((e) => e.workLocation).filter(Boolean))].sort(),
    employeeTypes: [...new Set(employees.map((e) => e.employeeType).filter(Boolean))].sort(),
  });
}

export async function POST(request) {
  const { error } = await requirePermission((p) => p.canEditHR);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const { data, error: invalid } = normalizeHrEmployeeInput(body, body.workforce);
  if (invalid) return jsonError(invalid);

  const rows = await sql`
    INSERT INTO hr_employees (
      workforce, employee_no, full_name, sex, job_title, job_title_key, grade,
      salary, desert_allowance, food_allowance, total_pay,
      department, work_location, employee_type, source
    ) VALUES (
      ${data.workforce}, ${data.employeeNo}, ${data.fullName}, ${data.sex},
      ${data.jobTitle}, ${data.jobTitleKey}, ${data.grade},
      ${data.salary}, ${data.desertAllowance}, ${data.foodAllowance}, ${data.totalPay},
      ${data.department}, ${data.workLocation}, ${data.employeeType}, 'manual'
    )
    RETURNING *
  `;

  return jsonOk(mapHrEmployee(rows[0]), 201);
}
