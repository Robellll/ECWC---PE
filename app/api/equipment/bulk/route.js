import { sql } from '@/lib/db.js';
import {
  requireEquipmentProjectAccess,
  jsonOk,
  jsonError,
} from '@/lib/api-helpers.js';
import { EQUIPMENT_TYPE_FROM_UI, EQUIPMENT_STATUS_FROM_UI } from '@/lib/mappers.js';
import { z } from 'zod';

const itemSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.string(),
  capacity: z.string().optional(),
  status: z.string().optional(),
  managerNotes: z.string().optional(),
});

export async function POST(request) {
  const body = await request.json();
  const projectId = body.projectId;
  if (!projectId) return jsonError('projectId is required');
  const { session, error } = await requireEquipmentProjectAccess(projectId, 'edit');
  if (error) return error;

  const items = z.array(itemSchema).safeParse(body.items);
  if (!items.success) return jsonError('Invalid input');
  const created = [];
  for (const item of items.data) {
    const type = EQUIPMENT_TYPE_FROM_UI[item.type] || 'other';
    const status = EQUIPMENT_STATUS_FROM_UI[item.status] || 'operational';
    const rows = await sql`
      INSERT INTO equipment (
        code, name, type, project_id, capacity, status, manager_notes, added_by_user_id, status_updated_at
      )
      VALUES (
        ${item.code.toUpperCase()}, ${item.name}, ${type}::equipment_type,
        ${projectId}, ${item.capacity || 'N/A'}, ${status}::equipment_status,
        ${item.managerNotes || ''}, ${session.user.id}, NOW()
      )
      ON CONFLICT (code) DO NOTHING
      RETURNING id
    `;
    if (rows[0]) created.push(rows[0].id);
  }
  return jsonOk({ created: created.length }, 201);
}
