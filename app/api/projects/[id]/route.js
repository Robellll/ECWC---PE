import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProject } from '@/lib/mappers.js';
import { z } from 'zod';

const updateSchema = z.object({ name: z.string().min(1).optional() });

export async function PATCH(request, { params }) {
  const { error } = await requirePermission((p) => p.isProjectEditor);
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
  return jsonOk(mapProject(rows[0]));
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission((p) => p.isProjectEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM projects WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  if (existing[0].is_unassigned) return jsonError('Cannot delete unassigned project', 400);
  const unassigned = await sql`SELECT id FROM projects WHERE is_unassigned = true LIMIT 1`;
  await sql`UPDATE project_contacts SET project_id = ${unassigned[0].id} WHERE project_id = ${id}`;
  await sql`DELETE FROM projects WHERE id = ${id}`;
  return jsonOk({ success: true });
}
