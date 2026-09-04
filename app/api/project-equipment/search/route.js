import { sql } from '@/lib/db.js';
import { requireSession, jsonOk } from '@/lib/api-helpers.js';
import { mapEquipment } from '@/lib/mappers.js';
import { getRolePermissions } from '@/lib/permissions.js';
import { canSearchAllEquipment } from '@/lib/equipment-access.js';

export async function GET(request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const perms = getRolePermissions(session.user.role);
  if (!canSearchAllEquipment(session, perms)) {
    return jsonOk([]);
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return jsonOk([]);

  const pattern = `%${q}%`;
  const projectScope = perms.isProjPEAdmin && !perms.canViewAllProjectEquipment
    ? session.user.projectId
    : null;

  const rows = projectScope
    ? await sql`
        SELECT e.*, p.name AS project_name, u.name AS added_by_name
        FROM equipment e
        JOIN projects p ON p.id = e.project_id
        LEFT JOIN users u ON u.id = e.added_by_user_id
        WHERE e.project_id = ${projectScope}
          AND (
            e.code ILIKE ${pattern}
            OR e.name ILIKE ${pattern}
            OR e.plate_serial ILIKE ${pattern}
            OR e.category ILIKE ${pattern}
            OR e.equipment_type_label ILIKE ${pattern}
            OR e.make ILIKE ${pattern}
            OR e.operator_name ILIKE ${pattern}
            OR p.name ILIKE ${pattern}
          )
        ORDER BY e.code ASC
        LIMIT 40
      `
    : await sql`
        SELECT e.*, p.name AS project_name, u.name AS added_by_name
        FROM equipment e
        JOIN projects p ON p.id = e.project_id
        LEFT JOIN users u ON u.id = e.added_by_user_id
        WHERE (
          e.code ILIKE ${pattern}
          OR e.name ILIKE ${pattern}
          OR e.plate_serial ILIKE ${pattern}
          OR e.category ILIKE ${pattern}
          OR e.equipment_type_label ILIKE ${pattern}
          OR e.make ILIKE ${pattern}
          OR e.operator_name ILIKE ${pattern}
          OR p.name ILIKE ${pattern}
        )
        ORDER BY p.name ASC, e.code ASC
        LIMIT 40
      `;

  return jsonOk(rows.map(mapEquipment));
}
