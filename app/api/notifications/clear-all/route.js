import { sql } from '@/lib/db.js';
import { requireSession, jsonOk } from '@/lib/api-helpers.js';
import { getRolePermissions } from '@/lib/permissions.js';

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const perms = getRolePermissions(session.user.role);
  if (!perms.canReceiveGarageNotifications) {
    return jsonOk({ cleared: 0 });
  }

  const rows = await sql`
    DELETE FROM notifications
    WHERE user_id = ${session.user.id}
    RETURNING id
  `;

  return jsonOk({ cleared: rows.length });
}
