import { sql } from '@/lib/db.js';
import { requireSession, jsonOk } from '@/lib/api-helpers.js';
import { mapEquipment } from '@/lib/mappers.js';
import { getRolePermissions } from '@/lib/permissions.js';
import { canViewProjectEquipment } from '@/lib/equipment-access.js';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const perms = getRolePermissions(session.user.role);

  const rows = await sql`
    SELECT e.*, p.name AS project_name, u.name AS added_by_name
    FROM equipment e
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN users u ON u.id = e.added_by_user_id
    ORDER BY e.registered_at DESC
  `;

  const visible = rows.filter((row) => canViewProjectEquipment(session, perms, row.project_id));
  return jsonOk(visible.map(mapEquipment));
}
