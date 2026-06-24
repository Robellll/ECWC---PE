import { sql } from '@/lib/db.js';
import { requireSession, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProject } from '@/lib/mappers.js';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const rows = await sql`
    SELECT * FROM projects
    ORDER BY is_unassigned ASC, LOWER(name) ASC
  `;
  return jsonOk(rows.map(mapProject));
}

export async function POST(request) {
  const { error } = await requirePermission((p) => p.isContactLogAdmin);
  if (error) return error;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const maxOrder = await sql`SELECT COALESCE(MAX(sort_order), 0) AS m FROM projects WHERE NOT is_unassigned`;
  const sortOrder = Number(maxOrder[0]?.m || 0) + 1;
  const rows = await sql`
    INSERT INTO projects (name, sort_order) VALUES (${parsed.data.name}, ${sortOrder})
    RETURNING *
  `;
  return jsonOk(mapProject(rows[0]), 201);
}
