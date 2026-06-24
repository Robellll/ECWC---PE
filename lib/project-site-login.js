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

export const SITE_LOGIN_ROLE = 'project_pe_maintenance';
