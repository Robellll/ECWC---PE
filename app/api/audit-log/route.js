import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';
import { mapAuditRow } from '@/lib/audit-log.js';

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 200;

export async function GET(request) {
  const { error } = await requirePermission((p) => p.canViewAuditTrail);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const module = searchParams.get('module');
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  const rows = module
    ? await sql`
        SELECT * FROM audit_log
        WHERE module = ${module}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : await sql`
        SELECT * FROM audit_log
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

  const countRows = module
    ? await sql`SELECT COUNT(*)::int AS total FROM audit_log WHERE module = ${module}`
    : await sql`SELECT COUNT(*)::int AS total FROM audit_log`;

  return jsonOk({
    items: rows.map(mapAuditRow),
    total: countRows[0]?.total ?? 0,
    limit,
    offset,
  });
}
