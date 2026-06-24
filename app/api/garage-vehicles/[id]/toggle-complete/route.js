import { sql } from '@/lib/db.js';
import { requireGarageVehicleAccess, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { isValidStaffName, isValidMaintenanceType } from '@/lib/garage.js';
import { vehicleScope } from '@/lib/garage-access.js';
import { createGarageCompletionNotifications } from '@/lib/notifications.js';
import { z } from 'zod';

const completeSchema = z.object({
  assignedTechnician: z.string().optional(),
  finalInspectionOfficer: z.string().optional(),
  maintenanceType: z.enum(['major', 'minor']).optional(),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { error, session, vehicle: existing } = await requireGarageVehicleAccess(id, 'edit');
  if (error) return error;

  const isCompleted = existing.status === 'completed';
  const scope = vehicleScope(existing);

  if (isCompleted) {
    const reopenStage = scope === 'project' ? 'under_maintenance' : 'under_maintenance';
    const rows = await sql`
      UPDATE garage_vehicles SET
        status = 'in_progress'::garage_status,
        stage = ${reopenStage}::garage_stage,
        completed_at = NULL,
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    await sql`
      INSERT INTO garage_progress_logs (vehicle_id, text)
      VALUES (${id}, ${'Record reopened for additional maintenance.'})
    `;
    const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
    return jsonOk(mapGarageVehicle(rows[0], logs));
  }

  const requiredStage = scope === 'project' ? 'under_maintenance' : 'final_inspection';
  if (existing.stage !== requiredStage) {
    const msg = scope === 'project'
      ? 'Equipment must be at Under Maintenance stage before completion'
      : 'Vehicle must be at Final Inspection stage before completion';
    return jsonError(msg, 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const assignedTechnician = (parsed.data.assignedTechnician || existing.assigned_technician || '').trim();
  const finalInspectionOfficer = (parsed.data.finalInspectionOfficer || existing.final_inspection_officer || '').trim();
  const maintenanceType = parsed.data.maintenanceType || existing.maintenance_type;

  if (!isValidStaffName(assignedTechnician)) {
    return jsonError('Assigned Mechanic is required before completion', 400);
  }
  if (scope === 'central' && !isValidStaffName(finalInspectionOfficer)) {
    return jsonError('Final Inspection Officer is required before completion', 400);
  }
  if (!isValidMaintenanceType(maintenanceType)) {
    return jsonError('Maintenance type (Major or Minor) is required before completion', 400);
  }

  const typeLabel = maintenanceType === 'major' ? 'Major' : 'Minor';
  const logText = scope === 'project'
    ? `${typeLabel} site maintenance completed by ${assignedTechnician}. Equipment released.`
    : `${typeLabel} maintenance completed by ${assignedTechnician}. Final inspection by ${finalInspectionOfficer}. Vehicle released.`;

  const rows = await sql`
    UPDATE garage_vehicles SET
      assigned_technician = ${assignedTechnician},
      final_inspection_officer = ${scope === 'central' ? finalInspectionOfficer : existing.final_inspection_officer || ''},
      maintenance_type = ${maintenanceType}::garage_maintenance_type,
      status = 'completed'::garage_status,
      stage = 'completed'::garage_stage,
      completed_at = ${new Date().toISOString()},
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  await sql`
    INSERT INTO garage_progress_logs (vehicle_id, text) VALUES (${id}, ${logText})
  `;
  if (scope === 'central') {
    await createGarageCompletionNotifications(rows[0], session.user.id);
  }
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
