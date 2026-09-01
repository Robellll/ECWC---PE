import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { logProdAudit } from '@/lib/production/mappers.js';

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;

  const plants = await sql`
    SELECT COUNT(*)::int AS c FROM prod_plants WHERE assigned_project_id = ${id}
  `;
  if (plants[0]?.c > 0) {
    return jsonError('Cannot delete a project that still has plants assigned', 400);
  }

  const rows = await sql`DELETE FROM prod_projects WHERE id = ${id} RETURNING id, name`;
  if (!rows[0]) return jsonError('Not found', 404);
  await logProdAudit(session.user.id, 'project', id, 'delete', rows[0].name);
  return jsonOk({ ok: true });
}
