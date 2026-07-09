/** Live equipment status groups for dashboards and site updates */

export const LIVE_STATUS = {
  OPERABLE: 'operable',
  IDLE: 'idle',
  DOWN: 'down',
};

export const LIVE_STATUS_LABELS = {
  operable: 'Operable',
  idle: 'Idle',
  down: 'Down',
};

export function equipmentLiveGroup(dbStatus) {
  if (dbStatus === 'operational') return LIVE_STATUS.OPERABLE;
  if (dbStatus === 'idle') return LIVE_STATUS.IDLE;
  return LIVE_STATUS.DOWN;
}

export function isDownStatus(dbStatus) {
  return dbStatus === 'breakdown' || dbStatus === 'under_maintenance';
}

/** Simplified UI options for project admins */
export const LIVE_STATUS_UI_OPTIONS = [
  { group: 'operable', label: 'Operable', uiValue: 'Operational' },
  { group: 'idle', label: 'Idle', uiValue: 'Idle' },
  { group: 'down', label: 'Down', uiValue: 'Breakdown' },
];

export function uiStatusFromGroup(group, currentDbStatus) {
  if (group === LIVE_STATUS.OPERABLE) return 'Operational';
  if (group === LIVE_STATUS.IDLE) return 'Idle';
  if (currentDbStatus === 'under_maintenance') return 'Under Maintenance';
  return 'Breakdown';
}

export function liveGroupFromUiStatus(uiStatus) {
  if (uiStatus === 'Operational') return LIVE_STATUS.OPERABLE;
  if (uiStatus === 'Idle') return LIVE_STATUS.IDLE;
  return LIVE_STATUS.DOWN;
}

export const CENTRAL_PROJECT_NAME = 'Kality/Central';
