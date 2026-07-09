import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProject } from '@/lib/mappers.js';
import {
  writeAuditLog, AUDIT_ACTION, AUDIT_MODULE, auditHref, actorName,
} from '@/lib/audit-log.js';
import { z } from 'zod';

const updateSchema = z.object({ name: z.string().min(1).optional() });

export async function PATCH(request, { params }) {
  const { session, error } = await requirePermission((p) => p.isContactLogProjectAdmin);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const existing = await sql`SELECT * FROM projects WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  if (existing[0].is_unassigned) return jsonError('Cannot edit unassigned project', 400);
  const rows = await sql`
    UPDATE projects SET name = COALESCE(${parsed.data.name}, name)
    WHERE id = ${id} RETURNING *
  `;
  await writeAuditLog(session, {
    action: AUDIT_ACTION.UPDATED,
    module: AUDIT_MODULE.CONTACT_LOG,
    entityId: id,
    projectId: id,
    href: auditHref.managers(),
    summary: `${actorName(session)} renamed project to ${rows[0].name}`,
  });
  return jsonOk(mapProject(rows[0]));
}

export async function DELETE(_request, { params }) {
  const { session, error } = await requirePermission((p) => p.isContactLogProjectAdmin);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM projects WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  if (existing[0].is_unassigned) return jsonError('Cannot delete unassigned project', 400);
  const unassigned = await sql`SELECT id FROM projects WHERE is_unassigned = true LIMIT 1`;
  await sql`UPDATE project_contacts SET project_id = ${unassigned[0].id} WHERE project_id = ${id}`;
  await sql`DELETE FROM projects WHERE id = ${id}`;
  await writeAuditLog(session, {
    action: AUDIT_ACTION.DELETED,
    module: AUDIT_MODULE.CONTACT_LOG,
    entityId: id,
    href: auditHref.managers(),
    summary: `${actorName(session)} deleted project ${existing[0].name}`,
  });
  return jsonOk({ success: true });
}
