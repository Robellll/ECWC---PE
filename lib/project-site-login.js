/** Helpers for per-project site garage login accounts */

export function slugifyProjectName(name) {
  return (name || 'site')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'site';
}

export function defaultSiteEmail(projectName) {
  return `garage.${slugifyProjectName(projectName)}@ecwc.gov.et`;
}

export function defaultSiteDisplayName(projectName) {
  return `${projectName} Site Garage`;
}

export function defaultEquipmentSiteEmail(projectName) {
  return `equipment.${slugifyProjectName(projectName)}@ecwc.gov.et`;
}

export function defaultEquipmentSiteDisplayName(projectName) {
  return `${projectName} Site Equipment`;
}

export const SITE_LOGIN_ROLE = 'project_pe_maintenance';
export const EQUIPMENT_SITE_LOGIN_ROLE = 'project_pe_admin';

export const GARAGE_SITE_LOGIN_CONFIG = {
  apiBase: '/api/project-garage',
  title: 'Project Site Login',
  hint: 'Create one shared login per project for site staff. When personnel change, set a new password — the email stays the same.',
  emailPlaceholder: 'garage.project-name@ecwc.gov.et',
  displayNamePlaceholder: 'Project site garage account',
  defaultEmail: defaultSiteEmail,
  defaultDisplayName: defaultSiteDisplayName,
};

export const EQUIPMENT_SITE_LOGIN_CONFIG = {
  apiBase: '/api/project-equipment',
  title: 'Project Equipment Login',
  hint: 'Create one shared login per project for site equipment staff. They can register and update machinery on site. Set a new password when personnel change.',
  emailPlaceholder: 'equipment.project-name@ecwc.gov.et',
  displayNamePlaceholder: 'Project site equipment account',
  defaultEmail: defaultEquipmentSiteEmail,
  defaultDisplayName: defaultEquipmentSiteDisplayName,
};
