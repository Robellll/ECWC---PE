/** Client-safe audit trail constants (no database imports). */

export const AUDIT_ACTION = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  BULK_CREATED: 'bulk_created',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  LOGIN: 'login',
};

export const AUDIT_MODULE = {
  EQUIPMENT: 'equipment',
  GARAGE: 'garage',
  PROJECT_GARAGE: 'project_garage',
  INSURANCE: 'insurance',
  PRODUCTION: 'production',
  CONTACT_LOG: 'contact_log',
  USERS: 'users',
  SYSTEM: 'system',
  AUTH: 'auth',
};

export const AUDIT_MODULE_LABELS = {
  equipment: 'Equipment',
  garage: 'Central Garage',
  project_garage: 'Project Garage',
  insurance: 'Insurance',
  production: 'Production',
  contact_log: 'Contact Log',
  users: 'Users',
  system: 'System',
  auth: 'Sign-in',
};

export const auditHref = {
  equipment: (projectId, itemId) => `/equipment/${projectId}?item=${itemId}`,
  equipmentProject: (projectId) => `/equipment/${projectId}`,
  centralGarage: (vehicleId) => `/garage?vehicle=${vehicleId}`,
  projectGarage: (projectId, vehicleId) => `/project-garage/${projectId}?vehicle=${vehicleId}`,
  projectGarageProject: (projectId) => `/project-garage/${projectId}`,
  insurance: (claimId) => `/insurance?claim=${claimId}`,
  managers: () => '/managers',
  productionPlants: () => '/production/plants',
  productionMaterials: () => '/production/materials',
  productionProjects: () => '/production/plants',
  productionDaily: () => '/production/daily',
  productionDemand: () => '/production/demand',
  productionDispatch: () => '/production/dispatch',
  users: () => '/managers',
};
