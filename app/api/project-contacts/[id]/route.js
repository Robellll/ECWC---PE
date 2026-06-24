import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapContact } from '@/lib/mappers.js';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(['admin', 'maintenance']).optional(),
  projectId: z.string().uuid().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request, { params }) {
  const { error } = await requirePermission((p) => p.isContactLogAdmin);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;
  const existing = await sql`SELECT * FROM project_contacts WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  const name = d.name ?? existing[0].name;
  const avatar = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const rows = await sql`
    UPDATE project_contacts SET
      name = ${name},
      phone = ${d.phone ?? existing[0].phone},
      email = ${d.email ?? existing[0].email},
      role = ${(d.role ?? existing[0].role)}::contact_role,
      project_id = ${d.projectId ?? existing[0].project_id},
      sort_order = ${d.sortOrder ?? existing[0].sort_order},
      avatar = ${avatar},
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  return jsonOk(mapContact(rows[0]));
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission((p) => p.isContactLogAdmin);
  if (error) return error;
  const { id } = await params;
  await sql`DELETE FROM project_contacts WHERE id = ${id}`;
  return jsonOk({ success: true });
}
