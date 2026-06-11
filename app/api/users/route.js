import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapUser } from '@/lib/mappers.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.string(),
  projectId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  const { error } = await requirePermission((p) => p.isUserAdmin);
  if (error) return error;
  const rows = await sql`SELECT id, email, name, role, project_id, created_at FROM users ORDER BY name`;
  return jsonOk(rows.map(mapUser));
}

export async function POST(request) {
  const { error } = await requirePermission((p) => p.isUserAdmin);
  if (error) return error;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;
  const passwordHash = await bcrypt.hash(d.password, 10);
  try {
    const rows = await sql`
      INSERT INTO users (email, password_hash, name, role, project_id)
      VALUES (${d.email}, ${passwordHash}, ${d.name}, ${d.role}::user_role, ${d.projectId || null})
      RETURNING id, email, name, role, project_id, created_at
    `;
    return jsonOk(mapUser(rows[0]), 201);
  } catch (e) {
    if (e.message?.includes('unique')) return jsonError('Email already exists', 409);
    throw e;
  }
}
