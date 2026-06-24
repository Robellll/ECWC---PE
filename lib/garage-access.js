import { getRolePermissions } from './permissions.js';

export function vehicleScope(row) {
  if (!row) return 'central';
  return row.garage_scope === 'project' || row.project_id ? 'project' : 'central';
}

export function isProjectScopedUser(perms) {
  return perms.isProjPEAdmin || perms.isProjPEMaintenance;
}

/** HQ and general staff see all projects; project roles see only their assigned project */
export function canViewProjectGarage(session, perms, projectId) {
  if (!projectId) return false;
  if (perms.isSuperAdmin || perms.isCEO || perms.isPEManager || perms.isPEAdmin || perms.isPEMaintenance) {
    return true;
  }
  if (isProjectScopedUser(perms)) {
    return session.user.projectId === projectId;
  }
  return true;
}

export function canEditProjectGarage(session, perms, projectId) {
  if (!projectId) return false;
  if (perms.isSuperAdmin) return true;
  if (isProjectScopedUser(perms)) {
    return session.user.projectId === projectId;
  }
  return false;
}

export function canEditGarageVehicle(session, row) {
  const perms = getRolePermissions(session.user.role);
  const scope = vehicleScope(row);
  if (scope === 'central') {
    return perms.isCentralGarageEditor;
  }
  return canEditProjectGarage(session, perms, row.project_id);
}

export function canViewGarageVehicle(session, row) {
  const perms = getRolePermissions(session.user.role);
  const scope = vehicleScope(row);
  if (scope === 'central') return true;
  return canViewProjectGarage(session, perms, row.project_id);
}
