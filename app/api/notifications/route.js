import { sql } from '@/lib/db.js';
import { requireSession, jsonOk } from '@/lib/api-helpers.js';
import { getRolePermissions } from '@/lib/permissions.js';
import { mapNotification } from '@/lib/notifications.js';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const perms = getRolePermissions(session.user.role);
  if (!perms.canReceiveGarageNotifications) {
    return jsonOk([]);
  }

  const rows = await sql`
    SELECT * FROM notifications
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return jsonOk(rows.map(mapNotification));
}
