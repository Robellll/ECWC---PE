import { sql } from '@/lib/db.js';
import { requireSession, requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import { mapGarageVehicle, PRIORITY_FROM_UI } from '@/lib/mappers.js';
import { GARAGE_WORKSHOPS } from '@/lib/garage.js';
import { resolveStaffDisplay } from '@/lib/garage-staff.js';
import { getManpowerDirectory } from '@/lib/manpower.js';
import { setActiveStaffDirectory } from '@/lib/garage-staff.js';
import {
  writeAuditLog, AUDIT_ACTION, AUDIT_MODULE, auditHref, actorName,
} from '@/lib/audit-log.js';
import { z } from 'zod';

const workshopValues = GARAGE_WORKSHOPS.map((w) => w.value);

const createSchema = z.object({
  plate: z.string().min(1),
  sroNumber: z.string().min(1),
  model: z.string().min(1),
  reportedIssue: z.string().min(1),
  workshop: z.string().refine((v) => workshopValues.includes(v), { message: 'Invalid workshop' }),
  receivingInspector: z.string().min(2),
  maintenanceType: z.enum(['major', 'minor']),
  priority: z.string().optional(),
});

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  try {
    const directory = await getManpowerDirectory();
    setActiveStaffDirectory(directory);
  } catch {
    // Table may not exist yet before migrate — keep seed directory
  }
  const vehicles = await sql`
    SELECT * FROM garage_vehicles
    WHERE garage_scope = 'central'
    ORDER BY registered_at DESC
  `;
  const result = [];
  for (const v of vehicles) {
    const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${v.id} ORDER BY created_at`;
    result.push(mapGarageVehicle(v, logs));
  }
  return jsonOk(result);
}

export async function POST(request) {
  const { session, error } = await requirePermission((p) => p.isCentralGarageEditor);
  if (error) return error;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');
  const d = parsed.data;
  const priority = PRIORITY_FROM_UI[d.priority] || 'normal';
  const receivingInspector = resolveStaffDisplay(d.receivingInspector);
  const rows = await sql`
    INSERT INTO garage_vehicles (
      plate, sro_number, model, reported_issue, workshop, receiving_inspector, maintenance_type, priority
    )
    VALUES (
      ${d.plate},
      ${d.sroNumber},
      ${d.model},
      ${d.reportedIssue},
      ${d.workshop}::garage_workshop,
      ${receivingInspector},
      ${d.maintenanceType}::garage_maintenance_type,
      ${priority}::priority_level
    )
    RETURNING *
  `;
  const typeLabel = d.maintenanceType === 'major' ? 'Major' : 'Minor';
  const logText = `Vehicle received at Central Garage. SRO: ${d.sroNumber}. ${typeLabel} maintenance. Assigned to workshop. Receiving inspector: ${receivingInspector}.`;
  await sql`
    INSERT INTO garage_progress_logs (vehicle_id, text) VALUES (${rows[0].id}, ${logText})
  `;
  const logs = await sql`SELECT * FROM garage_progress_logs WHERE vehicle_id = ${rows[0].id} ORDER BY created_at`;
  const mapped = mapGarageVehicle(rows[0], logs);
  await writeAuditLog(session, {
    action: AUDIT_ACTION.CREATED,
    module: AUDIT_MODULE.GARAGE,
    entityId: rows[0].id,
    href: auditHref.centralGarage(rows[0].id),
    summary: `${actorName(session)} registered central garage job ${d.plate} (${d.model})`,
  });
  return jsonOk(mapped, 201);
}
