export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  ceo: '1. CEO',
  pe_manager: '1.1 Plant & Equipment Manager',
  pe_admin: '1.1.1 Plant & Equipment Administration',
  project_pe_admin: '1.1.1.1 Project Plant & Equipment Administration',
  pe_maintenance: '1.1.2 Plant & Equipment Maintenance',
  project_pe_maintenance: '1.1.2.1 Project Plant & Equipment Maintenance',
  insurance_officer: '1.1.3 Insurance Officer',
};

export const LABEL_TO_ROLE = Object.fromEntries(
  Object.entries(ROLE_LABELS).map(([k, v]) => [v, k])
);

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export function getRolePermissions(role) {
  const dbRole = LABEL_TO_ROLE[role] || role;
  const isSuperAdmin = dbRole === 'super_admin';
  const isCEO = dbRole === 'ceo';
  const isPEManager = dbRole === 'pe_manager';
  const isPEAdmin = dbRole === 'pe_admin';
  const isProjPEAdmin = dbRole === 'project_pe_admin';
  const isPEMaintenance = dbRole === 'pe_maintenance';
  const isProjPEMaintenance = dbRole === 'project_pe_maintenance';
  const isInsuranceOfficer = dbRole === 'insurance_officer';

  return {
    isSuperAdmin,
    isCEO,
    isPEManager,
    isPEAdmin,
    isProjPEAdmin,
    isPEMaintenance,
    isProjPEMaintenance,
    isInsuranceOfficer,
    isGarageEditor: isSuperAdmin || isPEMaintenance || isProjPEMaintenance,
    isExecutive: isSuperAdmin || isCEO || isPEManager,
    isProjectAdmin: isProjPEAdmin,
    isInsuranceEditor: isSuperAdmin || isInsuranceOfficer,
    isEquipmentEditor: isSuperAdmin || isPEManager || isPEAdmin || isProjPEAdmin,
    isUserAdmin: isSuperAdmin,
    isProjectEditor: isSuperAdmin || isPEManager || isPEAdmin,
    canReceiveGarageNotifications: isSuperAdmin || isPEManager || isPEAdmin,
  };
}
