import { auth } from './auth.js';
import { getRolePermissions } from './permissions.js';

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

export function jsonOk(data, status = 200) {
  return Response.json(data, { status });
}

export function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}
