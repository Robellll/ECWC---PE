import { sql } from '@/lib/db.js';
import { requireSession, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapNotification } from '@/lib/notifications.js';

export async function POST(_request, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;

  const rows = await sql`
    UPDATE notifications SET is_read = TRUE
    WHERE id = ${id} AND user_id = ${session.user.id}
    RETURNING *
  `;
  if (!rows[0]) return jsonError('Not found', 404);
  return jsonOk(mapNotification(rows[0]));
}
