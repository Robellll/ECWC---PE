import { sql } from './db.js';
import { roleLabel } from './permissions.js';
import {
  AUDIT_ACTION,
  AUDIT_MODULE,
  AUDIT_MODULE_LABELS,
  auditHref,
} from './audit-log-constants.js';

export {
  AUDIT_ACTION,
  AUDIT_MODULE,
  AUDIT_MODULE_LABELS,
  auditHref,
} from './audit-log-constants.js';

const MAX_SUMMARY = 220;

export function truncateSummary(text) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_SUMMARY) return normalized;
  return `${normalized.slice(0, MAX_SUMMARY - 1)}…`;
}

export function actorName(session) {
  return session?.user?.name?.trim() || session?.user?.email?.trim() || 'Unknown user';
}

export function actorRoleLabel(session) {
  return roleLabel(session?.user?.role || '') || session?.user?.role || '';
}

export async function writeAuditLog(session, entry) {
  if (!session?.user?.id) return;
  const summary = truncateSummary(entry.summary);
  if (!summary || !entry.href || !entry.action || !entry.module) return;

  try {
    await sql`
      INSERT INTO audit_log (
        user_id, user_name, user_email, user_role,
        action, module, entity_id, summary, href, project_id
      ) VALUES (
        ${session.user.id},
        ${session.user.name || ''},
        ${session.user.email || ''},
        ${session.user.role || ''},
        ${entry.action},
        ${entry.module},
        ${entry.entityId || null},
        ${summary},
        ${entry.href},
        ${entry.projectId || null}
      )
    `;
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function mapAuditRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    userName: row.user_name,
    userEmail: row.user_email,
    userRole: row.user_role,
    userRoleLabel: roleLabel(row.user_role) || row.user_role,
    action: row.action,
    module: row.module,
    moduleLabel: AUDIT_MODULE_LABELS[row.module] || row.module,
    entityId: row.entity_id,
    summary: row.summary,
    href: row.href,
    projectId: row.project_id,
  };
}

export async function logUserLogin(user) {
  if (!user?.id) return;
  const name = user.name?.trim() || user.email?.trim() || 'Unknown user';
  const role = roleLabel(user.role) || user.role || '';
  const session = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
  await writeAuditLog(session, {
    action: AUDIT_ACTION.LOGIN,
    module: AUDIT_MODULE.AUTH,
    entityId: user.id,
    projectId: user.projectId || null,
    href: '/dashboard',
    summary: `${name} signed in${role ? ` (${role})` : ''}`,
  });
}
