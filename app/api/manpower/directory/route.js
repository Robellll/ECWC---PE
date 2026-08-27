import { requirePermission, jsonOk } from '@/lib/api-helpers.js';
import { getManpowerDirectory } from '@/lib/manpower.js';
import { setActiveStaffDirectory } from '@/lib/garage-staff.js';

/**
 * Lightweight active directory for ID → name lookup in garage forms.
 * Readable by Man Power roles and Central Garage editors (same maintenance group).
 */
export async function GET() {
  const { error } = await requirePermission(
    (p) => p.canViewManpower || p.isCentralGarageEditor,
  );
  if (error) return error;

  const directory = await getManpowerDirectory();
  setActiveStaffDirectory(directory);
  return jsonOk(directory);
}
