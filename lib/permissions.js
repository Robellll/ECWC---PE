export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  ceo: '1. CEO',
  pe_manager: '1.1 Plant & Equipment Manager',
  pe_admin: '1.1.1 Plant & Equipment Administration',
  project_pe_admin: '1.1.1.1 Project Plant & Equipment Administration',
  pe_maintenance: '1.1.2 Plant & Equipment Maintenance',
  project_pe_maintenance: '1.1.2.1 Project Plant & Equipment Maintenance',
  insurance_officer: '1.1.3 Insurance Officer',
  production_officer: '1.2 Production Officer',
  hr_coordinator: '1.1.4 HR Coordinator',
  central_garage_followup: 'Central Garage Follow-up',
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
  const isProductionOfficer = dbRole === 'production_officer';
  const isHRCoordinator = dbRole === 'hr_coordinator';
  const isCentralGarageFollowup = dbRole === 'central_garage_followup';

  return {
    isSuperAdmin,
    isCEO,
    isPEManager,
    isPEAdmin,
    isProjPEAdmin,
    isPEMaintenance,
    isProjPEMaintenance,
    isInsuranceOfficer,
    isProductionOfficer,
    isHRCoordinator,
    isCentralGarageFollowup,
    canViewProduction: isSuperAdmin || isProductionOfficer || isCEO || isPEManager || isPEAdmin,
    isProductionEditor: isSuperAdmin || isProductionOfficer,
    canExportProductionReports: isSuperAdmin || isProductionOfficer || isCEO || isPEManager || isPEAdmin,
    isGarageEditor: isSuperAdmin || isPEMaintenance,
    isCentralGarageEditor: isSuperAdmin || isPEMaintenance,
    isProjectGarageEditor: isSuperAdmin || isProjPEAdmin || isProjPEMaintenance,
    canViewAllProjectGarages: isSuperAdmin || isCEO || isPEManager || isPEAdmin || isPEMaintenance,
    isExecutive: isSuperAdmin || isCEO || isPEManager,
    isProjectAdmin: isProjPEAdmin,
    isInsuranceEditor: isSuperAdmin || isInsuranceOfficer,
    isEquipmentEditor: isSuperAdmin || isPEManager || isPEAdmin || isProjPEAdmin,
    canDeleteEquipment: isSuperAdmin || isPEManager || isPEAdmin,
    canViewAllProjectEquipment: isSuperAdmin || isCEO || isPEManager || isPEAdmin || isPEMaintenance,
    canEditAnyProjectEquipment: isSuperAdmin || isPEManager || isPEAdmin,
    isUserAdmin: isSuperAdmin,
    isContactLogProjectAdmin: isSuperAdmin,
    canManageContactLogContacts: isSuperAdmin || isPEAdmin,
    canReorderContactLog: isSuperAdmin || isPEManager || isPEAdmin || isPEMaintenance,
    isProjectEditor: isSuperAdmin,
    canReceiveGarageNotifications: isSuperAdmin || isPEManager || isPEAdmin,
    canViewAuditTrail: isSuperAdmin || isPEManager,
    // Man Power: HO Plant & Equipment Maintenance + Plant & Equipment Manager only
    canViewManpower: isSuperAdmin || isPEManager || isPEMaintenance,
    canEditManpower: isSuperAdmin || isPEManager || isPEMaintenance,
    // HR: Manager oversees (view only); only HR Coordinator adds/edits/deletes
    canViewHR: isSuperAdmin || isPEManager || isHRCoordinator,
    canEditHR: isHRCoordinator,
  };
}

/** Roles locked to a single module: landing page plus the only routes they may load. */
const ROLE_HOME = {
  central_garage_followup: '/garage',
  hr_coordinator: '/hr/dashboard',
};

const ROLE_PAGE_PREFIXES = {
  central_garage_followup: ['/garage'],
  hr_coordinator: ['/hr'],
};

const ROLE_API_PREFIXES = {
  central_garage_followup: ['/api/garage-vehicles', '/api/auth'],
  hr_coordinator: ['/api/hr', '/api/auth', '/api/notifications'],
};

function resolveRole(role) {
  return LABEL_TO_ROLE[role] || role;
}

export function getDefaultHomePath(role) {
  return ROLE_HOME[resolveRole(role)] || '/dashboard';
}

export function isPathAllowedForRole(role, pathname) {
  const prefixes = ROLE_PAGE_PREFIXES[resolveRole(role)];
  if (!prefixes) return true;
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isApiAllowedForRole(role, pathname) {
  const prefixes = ROLE_API_PREFIXES[resolveRole(role)];
  if (!prefixes) return true;
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}
