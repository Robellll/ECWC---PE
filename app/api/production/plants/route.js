import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapProdPlant, logProdAudit } from '@/lib/production/mappers.js';
import { assignPlantToProject } from '@/lib/production/projects.js';
import { validatePlantStatus } from '@/lib/production/plant-status.js';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  plantType: z.enum(['aggregate', 'crusher', 'ready_mix', 'asphalt', 'sand', 'base_course']),
  capacity: z.number().min(0),
  unit: z.string().min(1),
  projectName: z.string().min(2),
  status: z.enum(['operable', 'idle', 'down']).optional(),
  statusReason: z.string().optional(),
  commissionDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

async function enrichPlant(plantId) {
  const rows = await sql`
    SELECT pl.*, pp.name AS project_name
    FROM prod_plants pl
    LEFT JOIN prod_projects pp ON pp.id = pl.assigned_project_id
    WHERE pl.id = ${plantId}
  `;
  return rows[0];
}

export async function GET(request) {
  const { error } = await requirePermission((p) => p.canViewProduction);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  const rows = projectId
    ? await sql`
        SELECT pl.*, pp.name AS project_name
        FROM prod_plants pl
        LEFT JOIN prod_projects pp ON pp.id = pl.assigned_project_id
        WHERE pl.assigned_project_id = ${projectId}
        ORDER BY pl.name
      `
    : await sql`
        SELECT pl.*, pp.name AS project_name
        FROM prod_plants pl
        LEFT JOIN prod_projects pp ON pp.id = pl.assigned_project_id
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

  const status = d.status || 'operable';
  const statusCheck = validatePlantStatus(status, d.statusReason || '');
  if (!statusCheck.ok) return jsonError(statusCheck.error);

  const rows = await sql`
    INSERT INTO prod_plants (
      name, code, plant_type, capacity, unit,
      status, status_reason, commission_date, notes, status_changed_at
    ) VALUES (
      ${d.name}, ${d.code}, ${d.plantType}::prod_plant_type,
      ${d.capacity}, ${d.unit},
      ${status}::prod_plant_status,
      ${statusCheck.statusReason},
      ${d.commissionDate || null}, ${d.notes || ''}, NOW()
    ) RETURNING *
  `;

  await assignPlantToProject(rows[0].id, d.projectName);
  await logProdAudit(session.user.id, 'plant', rows[0].id, 'create', d.name);
  return jsonOk(mapProdPlant(await enrichPlant(rows[0].id)), 201);
}
