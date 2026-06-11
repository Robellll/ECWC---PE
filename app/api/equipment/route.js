import { sql } from '@/lib/db.js';
import { requireSession, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapEquipment, EQUIPMENT_TYPE_FROM_UI, EQUIPMENT_STATUS_FROM_UI } from '@/lib/mappers.js';
import { z } from 'zod';

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.string(),
  projectId: z.string().uuid().optional().nullable(),
  project: z.string().optional(),
  capacity: z.string().optional(),
  status: z.string().optional(),
  managerNotes: z.string().optional(),
});

async function resolveProjectId(projectId, projectName) {
  if (projectId) return projectId;
  if (!projectName || projectName === 'Idle / Unassigned') return null;
  const rows = await sql`SELECT id FROM projects WHERE name = ${projectName} LIMIT 1`;
  return rows[0]?.id || null;
}

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const rows = await sql`
    SELECT e.*, p.name AS project_name, u.name AS added_by_name
    FROM equipment e
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN users u ON u.id = e.added_by_user_id
    ORDER BY e.registered_at DESC
  `;
  return jsonOk(rows.map(mapEquipment));
}

export async function POST(request) {
  const { session, error } = await requirePermission((p) => p.isEquipmentEditor);
  if (error) return error;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;
  const type = EQUIPMENT_TYPE_FROM_UI[d.type] || d.type;
  const status = EQUIPMENT_STATUS_FROM_UI[d.status] || 'operational';
  const projectId = await resolveProjectId(d.projectId, d.project);
  const rows = await sql`
    INSERT INTO equipment (code, name, type, project_id, capacity, status, manager_notes, added_by_user_id)
    VALUES (
      ${d.code.toUpperCase()}, ${d.name}, ${type}::equipment_type,
      ${projectId}, ${d.capacity || 'N/A'}, ${status}::equipment_status,
      ${d.managerNotes || ''}, ${session.user.id}
    )
    RETURNING *
  `;
  const full = await sql`
    SELECT e.*, p.name AS project_name, u.name AS added_by_name
    FROM equipment e
    LEFT JOIN projects p ON p.id = e.project_id
    LEFT JOIN users u ON u.id = e.added_by_user_id
    WHERE e.id = ${rows[0].id}
  `;
  return jsonOk(mapEquipment(full[0]), 201);
}
