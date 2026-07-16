import { LIVE_STATUS_UI_OPTIONS } from './equipment.js';

export const EQUIPMENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export function emptyEquipmentForm() {
  return {
    assetNo: '',
    plateSerial: '',
    model: '',
    status: 'Operational',
    statusReason: '',
    operatorName: '',
    operatorPhone: '',
    capacity: '',
    remarks: '',
    photo: '',
    photoPreview: '',
  };
}

export function emptyBulkEquipmentRow() {
  return {
    id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    assetNo: '',
    plateSerial: '',
    model: '',
    status: 'Operational',
    statusReason: '',
    operatorName: '',
    operatorPhone: '',
    capacity: '',
    remarks: '',
  };
}

export function isBulkRowComplete(row) {
  return Boolean(
    row.assetNo?.trim()
    && row.plateSerial?.trim()
    && row.model?.trim(),
  );
}

export function isBulkRowEmpty(row) {
  return !row.assetNo?.trim()
    && !row.plateSerial?.trim()
    && !row.model?.trim()
    && !row.operatorName?.trim()
    && !row.operatorPhone?.trim()
    && !row.capacity?.trim()
    && !row.remarks?.trim();
}

export function isBulkRowPartial(row) {
  return !isBulkRowEmpty(row) && !isBulkRowComplete(row);
}

export { LIVE_STATUS_UI_OPTIONS as EQUIPMENT_STATUS_OPTIONS };

export function liveGroupFromUiStatus(uiStatus) {
  if (uiStatus === 'Operational') return 'operable';
  if (uiStatus === 'Idle') return 'idle';
  return 'down';
}

export function requiresStatusReason(uiStatus) {
  return uiStatus === 'Idle' || uiStatus === 'Breakdown';
}

export function statusReasonLabel(uiStatus) {
  if (uiStatus === 'Idle') return 'Reason for idle';
  if (uiStatus === 'Breakdown') return 'Reason for down';
  return 'Status reason';
}

export function statusReasonPlaceholder(uiStatus) {
  if (uiStatus === 'Idle') {
    return 'e.g. Awaiting operator, parked off-site, seasonal stand-by…';
  }
  return 'e.g. Hydraulic leak, engine failure, awaiting spare parts…';
}

export function validateStatusReason(uiStatus, statusReason) {
  if (!requiresStatusReason(uiStatus)) return null;
  if (!statusReason?.trim()) {
    return uiStatus === 'Idle'
      ? 'Please enter the reason this equipment is idle.'
      : 'Please enter the reason this equipment is down.';
  }
  return null;
}

export async function readEquipmentPhoto(file) {
  if (!file) return null;
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Photo must be JPEG, PNG, or WebP');
  }
  if (file.size > EQUIPMENT_PHOTO_MAX_BYTES) {
    throw new Error('Photo must be 2 MB or smaller');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read photo file'));
    reader.readAsDataURL(file);
  });
}
