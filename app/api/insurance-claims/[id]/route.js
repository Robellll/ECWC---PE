import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk } from '@/lib/api-helpers.js';
import {
  writeAuditLog, AUDIT_ACTION, AUDIT_MODULE, auditHref, actorName,
} from '@/lib/audit-log.js';

export async function DELETE(_request, { params }) {
  const { session, error } = await requirePermission((p) => p.isInsuranceEditor);
  if (error) return error;
  const { id } = await params;
  const existing = await sql`SELECT plate, vehicle_type FROM insurance_claims WHERE id = ${id}`;
  await sql`DELETE FROM insurance_claims WHERE id = ${id}`;
  if (existing[0]) {
    await writeAuditLog(session, {
      action: AUDIT_ACTION.DELETED,
      module: AUDIT_MODULE.INSURANCE,
      entityId: id,
      href: auditHref.insurance(id),
      summary: `${actorName(session)} deleted insurance claim ${existing[0].plate} (${existing[0].vehicle_type})`,
    });
  }
  return jsonOk({ success: true });
}
