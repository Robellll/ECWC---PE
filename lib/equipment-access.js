export function canViewAllProjectEquipment(perms) {
  return perms.canViewAllProjectEquipment;
}

export function canViewProjectEquipment(session, perms, projectId) {
  if (!projectId) return false;
  if (perms.canViewAllProjectEquipment) return true;
  if (perms.isProjPEAdmin && session.user.projectId === projectId) return true;
  return false;
}

export function canEditProjectEquipment(session, perms, projectId) {
  if (!projectId) return false;
  if (perms.isSuperAdmin || perms.isPEManager || perms.isPEAdmin) return true;
  if (perms.isProjPEAdmin && session.user.projectId === projectId) return true;
  return false;
}

export function canDeleteEquipment(perms) {
  return perms.canDeleteEquipment;
}

export function canReassignEquipment(perms) {
  return perms.canEditAnyProjectEquipment;
}

export function canSearchAllEquipment(session, perms) {
  return canViewAllProjectEquipment(perms)
    || (perms.isProjPEAdmin && Boolean(session.user.projectId));
}
