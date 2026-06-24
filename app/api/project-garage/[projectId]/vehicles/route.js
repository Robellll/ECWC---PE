import { sql } from '@/lib/db.js';
import { requireSession, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle, PRIORITY_FROM_UI } from '@/lib/mappers.js';
import { getRolePermissions } from '@/lib/permissions.js';
import { canViewProjectGarage, canEditProjectGarage } from '@/lib/garage-access.js';
import { fetchProjectGarageVehicles } from '@/lib/garage-vehicles.js';
import { z } from 'zod';

const createSchema = z.object({
  plate: z.string().min(1),
  model: z.string().min(1),
  reportedIssue: z.string().min(1),
  siteSupervisor: z.string().min(2),
  maintenanceType: z.enum(['major', 'minor']),
  priority: z.string().optional(),
  siteOperatorName: z.string().optional(),
});

async function getProject(projectId) {
  const rows = await sql`
    SELECT * FROM projects WHERE id = ${projectId} AND NOT is_unassigned
  `;
  return rows[0] || null;
}

export async function GET(_request, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) return jsonError('Project not found', 404);

  const perms = getRolePermissions(session.user.role);
  if (!canViewProjectGarage(session, perms, projectId)) {
    return jsonError('Forbidden', 403);
  }

  const vehicles = await fetchProjectGarageVehicles(projectId);
  return jsonOk({ project: { id: project.id, name: project.name }, vehicles });
}

export async function POST(request, { params }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) return jsonError('Project not found', 404);

  const perms = getRolePermissions(session.user.role);
  if (!canEditProjectGarage(session, perms, projectId)) {
    return jsonError('Forbidden', 403);
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;
  const priority = PRIORITY_FROM_UI[d.priority] || 'normal';
  const operatorName = (d.siteOperatorName || session.user.name || '').trim();

  const rows = await sql`
    INSERT INTO garage_vehicles (
      plate, model, reported_issue, receiving_inspector, maintenance_type, priority,
      garage_scope, project_id, site_operator_name
    )
    VALUES (
      ${d.plate},
      ${d.model},
      ${d.reportedIssue},
      ${d.siteSupervisor.trim()},
      ${d.maintenanceType}::garage_maintenance_type,
      ${priority}::priority_level,
      'project'::garage_scope,
      ${projectId},
      ${operatorName}
    )
    RETURNING *
  `;

  const typeLabel = d.maintenanceType === 'major' ? 'Major' : 'Minor';
  const logText = `Equipment received at project site (${project.name}). ${typeLabel} maintenance. Site supervisor: ${d.siteSupervisor.trim()}.${operatorName ? ` Registered by ${operatorName}.` : ''}`;
  await sql`
    INSERT INTO garage_progress_logs (vehicle_id, text) VALUES (${rows[0].id}, ${logText})
  `;
  const logs = await sql`
    SELECT * FROM garage_progress_logs WHERE vehicle_id = ${rows[0].id} ORDER BY created_at
  `;
  return jsonOk(mapGarageVehicle(rows[0], logs), 201);
}
