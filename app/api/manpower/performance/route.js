import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { getManpowerPerformance } from '@/lib/manpower.js';
import { setActiveStaffDirectory } from '@/lib/garage-staff.js';
import { getManpowerDirectory } from '@/lib/manpower.js';

export async function GET(request) {
  const { error } = await requirePermission((p) => p.canViewManpower);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || null;
  const to = searchParams.get('to') || null;

  if (from && Number.isNaN(Date.parse(from))) return jsonError('Invalid from date');
  if (to && Number.isNaN(Date.parse(to))) return jsonError('Invalid to date');

  const directory = await getManpowerDirectory();
  setActiveStaffDirectory(directory);

  const toEnd = to ? new Date(to) : null;
  if (toEnd) {
    toEnd.setHours(23, 59, 59, 999);
  }

  const result = await getManpowerPerformance({
    from: from ? new Date(from).toISOString() : null,
    to: toEnd ? toEnd.toISOString() : null,
  });
  return jsonOk(result);
}
