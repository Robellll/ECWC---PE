import { auth } from './auth.js';
import { getRolePermissions } from './permissions.js';
import { canEditGarageVehicle, canViewGarageVehicle } from './garage-access.js';
import {
  canDeleteEquipment,
  canEditProjectEquipment,
  canViewProjectEquipment,
} from './equipment-access.js';

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session };
}

export async function requirePermission(checkFn) {
  const result = await requireSession();
  if (result.error) return result;
  const perms = getRolePermissions(result.session.user.role);
  if (!checkFn(perms)) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}

export async function requireGarageVehicleAccess(id, mode = 'edit') {
  const result = await requireSession();
  if (result.error) return result;
  const { sql } = await import('./db.js');
  const rows = await sql`SELECT * FROM garage_vehicles WHERE id = ${id}`;
  if (!rows[0]) {
    return { error: Response.json({ error: 'Not found' }, { status: 404 }) };
  }
  const row = rows[0];
  const allowed = mode === 'view'
    ? canViewGarageVehicle(result.session, row)
    : canEditGarageVehicle(result.session, row);
  if (!allowed) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ...result, vehicle: row };
}

export async function requireEquipmentProjectAccess(projectId, mode = 'view') {
  const result = await requireSession();
  if (result.error) return result;
  const perms = getRolePermissions(result.session.user.role);
  const allowed = mode === 'edit'
    ? canEditProjectEquipment(result.session, perms, projectId)
    : canViewProjectEquipment(result.session, perms, projectId);
  if (!allowed) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}

export async function requireEquipmentItemAccess(id, mode = 'edit') {
  const result = await requireSession();
  if (result.error) return result;
  const { sql } = await import('./db.js');
  const rows = await sql`SELECT * FROM equipment WHERE id = ${id}`;
  if (!rows[0]) {
    return { error: Response.json({ error: 'Not found' }, { status: 404 }) };
  }
  const row = rows[0];
  const perms = getRolePermissions(result.session.user.role);
  if (mode === 'delete') {
    if (!canDeleteEquipment(perms)) {
      return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    return { ...result, equipment: row };
  }
  const allowed = mode === 'view'
    ? canViewProjectEquipment(result.session, perms, row.project_id)
    : canEditProjectEquipment(result.session, perms, row.project_id);
  if (!allowed) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ...result, equipment: row };
}

export function jsonOk(data, status = 200) {
  return Response.json(data, { status });
}

export function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}
