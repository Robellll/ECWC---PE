import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle } from '@/lib/mappers.js';
import { z } from 'zod';

const updateSchema = z.object({
  assignedTechnician: z.string().optional(),
  finalInspectionOfficer: z.string().optional(),
  maintenanceType: z.enum(['major', 'minor']).optional().nullable(),
});

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isGarageEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  if (!existing[0]) return jsonError('Not found', 404);
  if (existing[0].status === 'completed') {
    return jsonError('Cannot update completion fields on a completed vehicle', 400);
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const assignedTechnician =
    parsed.data.assignedTechnician !== undefined
      ? parsed.data.assignedTechnician.trim()
      : existing[0].assigned_technician;
  const finalInspectionOfficer =
    parsed.data.finalInspectionOfficer !== undefined
      ? parsed.data.finalInspectionOfficer.trim()
      : existing[0].final_inspection_officer;
  const maintenanceType =
    parsed.data.maintenanceType !== undefined
      ? parsed.data.maintenanceType
      : existing[0].maintenance_type;

  const rows = await sql`
    UPDATE garage_vehicles SET
      assigned_technician = ${assignedTechnician},
      final_inspection_officer = ${finalInspectionOfficer},
      maintenance_type = ${maintenanceType},
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${id} ORDER BY created_at`;
  return jsonOk(mapGarageVehicle(rows[0], logs));
}
