import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { isValidStaffName } from '@/lib/garage.js';
import { z } from 'zod';

const completeSchema = z.object({
  assignedTechnician: z.string().optional(),
  finalInspectionOfficer: z.string().optional(),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isGarageEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);

  const isCompleted = existing[0].status === 'completed';

  if (isCompleted) {
    const rows = await sql`
      UPDATE garage_vehicles SET
        status = 'in_progress'::garage_status,
        stage = 'under_maintenance'::garage_stage,
        completed_at = NULL,
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    await sql`
      INSERT INTO garage_progress_logs (vehicle_id, text)
      VALUES (${id}, ${'Vehicle reopened for additional maintenance.'})
    `;
    const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
    return jsonOk(mapGarageVehicle(rows[0], logs));
  }

  if (existing[0].stage !== 'final_inspection') {
    return jsonError('Vehicle must be at Final Inspection stage before completion', 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const assignedTechnician = (parsed.data.assignedTechnician || existing[0].assigned_technician || '').trim();
  const finalInspectionOfficer = (parsed.data.finalInspectionOfficer || existing[0].final_inspection_officer || '').trim();

  if (!isValidStaffName(assignedTechnician)) {
    return jsonError('Assigned Technician is required before completion', 400);
  }
  if (!isValidStaffName(finalInspectionOfficer)) {
    return jsonError('Final Inspection Officer is required before completion', 400);
  }

  const rows = await sql`
    UPDATE garage_vehicles SET
      assigned_technician = ${assignedTechnician},
      final_inspection_officer = ${finalInspectionOfficer},
      status = 'completed'::garage_status,
      stage = 'completed'::garage_stage,
      completed_at = ${new Date().toISOString()},
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  await sql`
    INSERT INTO garage_progress_logs (vehicle_id, text)
    VALUES (
      ${id},
      ${`Maintenance completed by ${assignedTechnician}. Final inspection by ${finalInspectionOfficer}. Vehicle released.`}
    )
  `;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
