import { sql } from '@/lib/db.js';
import { requireGarageVehicleAccess, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { vehicleScope } from '@/lib/garage-access.js';
import {
  writeAuditLog, AUDIT_ACTION, AUDIT_MODULE, auditHref, actorName,
} from '@/lib/audit-log.js';
import { nextGarageStage, nextProjectGarageStage } from '@/lib/stages.js';
import {
  validateMaintenanceLocationPayload,
  maintenanceLocationLogLabel,
} from '@/lib/maintenance-location.js';
import { z } from 'zod';

const STAGE_LABELS = {
  received: 'Received',
  under_maintenance: 'Under Maintenance',
  final_inspection: 'Final Inspection',
  completed: 'Completed',
};

const bodySchema = z.object({
  maintenanceLocation: z.enum(['on_site', 'central', 'outsource']).optional(),
  outsourceGarageName: z.string().optional(),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { session, error, vehicle: existing } = await requireGarageVehicleAccess(id, 'edit');
  if (error) return error;
  if (existing.status === 'completed') {
    return jsonError('Completed vehicles cannot advance stage', 400);
  }

  const scope = vehicleScope(existing);
  const nextStage = scope === 'project'
    ? nextProjectGarageStage(existing.stage)
    : nextGarageStage(existing.stage);

  if (nextStage === existing.stage) {
    return jsonError('Vehicle is already at the maximum advanceable stage', 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  let maintenanceLocation = null;
  let outsourceGarageName = '';

  if (nextStage === 'under_maintenance') {
    const validation = validateMaintenanceLocationPayload(
      parsed.data.maintenanceLocation,
      parsed.data.outsourceGarageName,
      scope,
    );
    if (!validation.ok) return jsonError(validation.error);
    maintenanceLocation = parsed.data.maintenanceLocation;
    outsourceGarageName = maintenanceLocation === 'outsource'
      ? (parsed.data.outsourceGarageName || '').trim()
      : '';
  }

  let rows;
  if (nextStage === 'under_maintenance') {
    rows = await sql`
      UPDATE garage_vehicles SET
        stage = ${nextStage}::garage_stage,
        maintenance_location = ${maintenanceLocation}::garage_maintenance_location,
        outsource_garage_name = ${outsourceGarageName},
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
  } else {
    rows = await sql`
      UPDATE garage_vehicles SET
        stage = ${nextStage}::garage_stage,
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
  }

  const label = STAGE_LABELS[nextStage] || nextStage;
  let logText = `Stage advanced to ${label}.`;
  if (nextStage === 'under_maintenance') {
    logText += ` ${maintenanceLocationLogLabel(maintenanceLocation, outsourceGarageName, scope)}.`;
  }
  await sql`
    INSERT INTO garage_progress_logs (vehicle_id, text)
    VALUES (${id}, ${logText})
  `;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  const href = scope === 'project' && rows[0].project_id
    ? auditHref.projectGarage(rows[0].project_id, id)
    : auditHref.centralGarage(id);
  await writeAuditLog(session, {
    action: AUDIT_ACTION.UPDATED,
    module: scope === 'project' ? AUDIT_MODULE.PROJECT_GARAGE : AUDIT_MODULE.GARAGE,
    entityId: id,
    projectId: rows[0].project_id || null,
    href,
    summary: `${actorName(session)} advanced ${existing.plate} to ${label}`,
  });
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
