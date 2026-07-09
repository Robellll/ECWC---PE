import { sql } from '@/lib/db.js';
import { requireGarageVehicleAccess, jsonOk } from '@/lib/api-helpers.js';
import {
  writeAuditLog, AUDIT_ACTION, AUDIT_MODULE, auditHref, actorName,
} from '@/lib/audit-log.js';

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { session, vehicle, error } = await requireGarageVehicleAccess(id, 'edit');
  if (error) return error;
  const href = vehicle.garage_scope === 'project' && vehicle.project_id
    ? auditHref.projectGarage(vehicle.project_id, id)
    : auditHref.centralGarage(id);
  const module = vehicle.garage_scope === 'project' ? AUDIT_MODULE.PROJECT_GARAGE : AUDIT_MODULE.GARAGE;
  await sql`DELETE FROM garage_vehicles WHERE id = ${id}`;
  await writeAuditLog(session, {
    action: AUDIT_ACTION.DELETED,
    module,
    entityId: id,
    projectId: vehicle.project_id || null,
    href,
    summary: `${actorName(session)} deleted garage job ${vehicle.plate} (${vehicle.model})`,
  });
  return jsonOk({ success: true });
}
