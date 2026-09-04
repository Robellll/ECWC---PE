import { LIVE_STATUS_UI_OPTIONS } from './equipment.js';
import {
  EQUIPMENT_CATEGORIES,
  isValidCategoryType,
  parseOptionalNumber,
  parseOptionalYear,
} from './equipment-register.js';

export const EQUIPMENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export function emptyEquipmentForm() {
  return {
    assetNo: '',
    name: '',
    category: 'Machinery',
    equipmentType: 'Dozer',
    make: '',
    manufacturingYear: '',
    fuelNorm: '',
    leaseRateHour: '',
    status: 'Operational',
    statusReason: '',
    plateSerial: '',
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
    name: '',
    category: 'Machinery',
    equipmentType: 'Dozer',
    make: '',
    manufacturingYear: '',
    fuelNorm: '',
    leaseRateHour: '',
    status: 'Operational',
    statusReason: '',
    plateSerial: '',
    remarks: '',
  };
}

export function isBulkRowComplete(row) {
  return Boolean(
    row.assetNo?.trim()
    && row.name?.trim()
    && row.category?.trim()
    && row.equipmentType?.trim()
    && row.make?.trim(),
  );
}

export function isBulkRowEmpty(row) {
  return !row.assetNo?.trim()
    && !row.name?.trim()
    && !row.make?.trim()
    && !row.manufacturingYear
    && !row.fuelNorm
    && !row.leaseRateHour
    && !row.plateSerial?.trim()
    && !row.remarks?.trim()
    && !row.statusReason?.trim();
}

export function isBulkRowPartial(row) {
  return !isBulkRowEmpty(row) && !isBulkRowComplete(row);
}

export { LIVE_STATUS_UI_OPTIONS as EQUIPMENT_STATUS_OPTIONS, EQUIPMENT_CATEGORIES };

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

export function validateAssetRegisterFields(form) {
  if (!form.assetNo?.trim()) return 'Asset ID is required';
  if (!form.name?.trim()) return 'Asset / Equipment Name is required';
  if (!form.category?.trim()) return 'Category is required';
  if (!form.equipmentType?.trim()) return 'Equipment Type is required';
  if (!isValidCategoryType(form.category, form.equipmentType)) {
    return 'Equipment Type does not match the selected Category';
  }
  if (!form.make?.trim()) return 'Make is required';

  const year = parseOptionalYear(form.manufacturingYear);
  if (form.manufacturingYear !== '' && form.manufacturingYear != null && year === null) {
    return 'Manufacturing Year must be a valid year (1950–2100)';
  }
  if (form.fuelNorm !== '' && form.fuelNorm != null && parseOptionalNumber(form.fuelNorm) === null) {
    return 'Fuel Norm must be a number';
  }
  if (form.leaseRateHour !== '' && form.leaseRateHour != null && parseOptionalNumber(form.leaseRateHour) === null) {
    return 'Lease Rate/Hour must be a number';
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
