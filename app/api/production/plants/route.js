import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdPlant, logProdAudit } from '@/lib/production/mappers.js';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  plantType: z.enum(['aggregate', 'crusher', 'ready_mix', 'asphalt', 'sand', 'base_course']),
  capacity: z.number().min(0),
  unit: z.string().min(1),
  location: z.string().optional(),
  assignedProjectId: z.string().uuid().nullable().optional(),
  status: z.enum(['running', 'idle', 'maintenance', 'out_of_service']).optional(),
  commissionDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;
  const rows = await sql`
    SELECT pl.*, p.name AS project_name
    FROM prod_plants pl
    LEFT JOIN prod_projects p ON p.id = pl.assigned_project_id
    ORDER BY pl.name
  `;
  return jsonOk(rows.map((r) => mapProdPlant(r)));
}

export async function POST(request) {
  const { error, session } = await requirePermission((p) => p.isProductionEditor);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid plant data');
  const d = parsed.data;

  const rows = await sql`
    INSERT INTO prod_plants (
      name, code, plant_type, capacity, unit, location,
      assigned_project_id, status, commission_date, notes, status_changed_at
    ) VALUES (
      ${d.name}, ${d.code}, ${d.plantType}::prod_plant_type,
      ${d.capacity}, ${d.unit}, ${d.location || ''},
      ${d.assignedProjectId || null},
      ${(d.status || 'idle')}::prod_plant_status,
      ${d.commissionDate || null}, ${d.notes || ''}, NOW()
    ) RETURNING *
  `;
  if (d.assignedProjectId) {
    await sql`
      INSERT INTO prod_plant_projects (plant_id, project_id)
      VALUES (${rows[0].id}, ${d.assignedProjectId}) ON CONFLICT DO NOTHING
    `;
  }
  await logProdAudit(session.user.id, 'plant', rows[0].id, 'create', d.name);
  return jsonOk(mapProdPlant(rows[0]), 201);
}
