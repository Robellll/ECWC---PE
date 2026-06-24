import { auth } from './auth.js';
import { getRolePermissions } from './permissions.js';
import { canEditGarageVehicle, canViewGarageVehicle } from './garage-access.js';

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

export function jsonOk(data, status = 200) {
  return Response.json(data, { status });
}

export function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}
