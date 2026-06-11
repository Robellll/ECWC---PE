import { sql } from '@/lib/db.js';
import { requireSession, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapContact } from '@/lib/mappers.js';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['admin', 'maintenance']),
  projectId: z.string().uuid(),
});

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const rows = await sql`SELECT * FROM project_contacts ORDER BY sort_order, name`;
  return jsonOk(rows.map(mapContact));
}

export async function POST(request) {
  const { error } = await requirePermission((p) => p.isProjectEditor);
  if (error) return error;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const { name, phone, email, role, projectId } = parsed.data;
  const avatar = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM project_contacts`;
  const rows = await sql`
    INSERT INTO project_contacts (name, phone, email, role, project_id, avatar, sort_order)
    VALUES (${name}, ${phone || null}, ${email || null}, ${role}::contact_role, ${projectId}, ${avatar}, ${Number(maxOrder[0]?.m || 0) + 1})
    RETURNING *
  `;
  return jsonOk(mapContact(rows[0]), 201);
}
