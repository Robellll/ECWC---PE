import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';
import { buildHrDashboard, WORKFORCES } from '@/lib/hr.js';

export async function GET(request) {
  const { error } = await requirePermission((p) => p.canViewHR);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('workforce') || 'all';
  const workforce = WORKFORCES.includes(requested) ? requested : 'all';

  const rows = workforce === 'all'
    ? await sql`SELECT * FROM hr_employees WHERE is_active`
    : await sql`SELECT * FROM hr_employees WHERE is_active AND workforce = ${workforce}`;

  return jsonOk({ workforce, ...buildHrDashboard(rows) });
}
