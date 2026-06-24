import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { z } from 'zod';

const schema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  role: z.enum(['admin', 'maintenance']),
  sortOrder: z.number().int(),
});

export async function PATCH(request) {
  const { error } = await requirePermission((p) => p.canReorderContactLog);
  if (error) return error;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const { id, projectId, role, sortOrder } = parsed.data;
  await sql`
    UPDATE project_contacts SET
      project_id = ${projectId},
      role = ${role}::contact_role,
      sort_order = ${sortOrder},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  return jsonOk({ success: true });
}
