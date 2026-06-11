import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapUser } from '@/lib/mappers.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  projectId: z.string().uuid().optional().nullable(),
});

export async function GET(_request, { params }) {
  const { error } = await requirePermission((p) => p.isUserAdmin);
  if (error) return error;
  const { id } = await params;
  const rows = await sql`SELECT id, email, name, role, project_id, created_at FROM users WHERE id = ${id}`;
  if (!rows[0]) return jsonError('Not found', 404);
  return jsonOk(mapUser(rows[0]));
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission((p) => p.isUserAdmin);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const existing = await sql`SELECT * FROM users WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  const d = parsed.data;
  const passwordHash = d.password ? await bcrypt.hash(d.password, 10) : existing[0].password_hash;
  const rows = await sql`
    UPDATE users SET
      email = ${d.email ?? existing[0].email},
      password_hash = ${passwordHash},
      name = ${d.name ?? existing[0].name},
      role = ${(d.role ?? existing[0].role)}::user_role,
      project_id = ${d.projectId !== undefined ? d.projectId : existing[0].project_id},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, email, name, role, project_id, created_at
  `;
  return jsonOk(mapUser(rows[0]));
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission((p) => p.isUserAdmin);
  if (error) return error;
  const { id } = await params;
  await sql`DELETE FROM users WHERE id = ${id}`;
  return jsonOk({ success: true });
}
