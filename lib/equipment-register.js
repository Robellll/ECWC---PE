/** Asset Register lists from sample fleet Excel (Lists sheet). */

export const EQUIPMENT_CATEGORIES = [
  { value: 'Light', label: 'Light' },
  { value: 'Heavy', label: 'Heavy' },
  { value: 'Machinery', label: 'Machinery' },
  { value: 'Others', label: 'Others' },
];

export const EQUIPMENT_TYPES_BY_CATEGORY = {
  Light: [
    'Automobile',
    'Pick Up / Station Wagon / Mini Bus',
  ],
  Heavy: [
    'Heavy Truck',
  ],
  Machinery: [
    'Earth Moving Machinery (General PM & Engine)',
    'Dozer',
    'Excavator',
    'Loader',
    'Grader',
  ],
  Others: [
    'Generator',
    'Air Compressor',
    'Electrical & Electronics',
  ],
};

/** Map Excel equipment type → existing DB equipment_type enum. */
export function dbTypeFromEquipmentTypeLabel(label) {
  const key = String(label || '').toLowerCase();
  if (key.includes('excavator')) return 'excavator';
  if (key.includes('dozer')) return 'dozer';
  if (key.includes('grader')) return 'grader';
  if (key.includes('loader')) return 'loader';
  if (key.includes('generator')) return 'generator';
  if (key.includes('heavy truck') || key.includes('dump')) return 'dump_truck';
  if (key.includes('automobile') || key.includes('pick up') || key.includes('mini bus')) return 'vehicle';
  if (key.includes('air compressor') || key.includes('earth moving')) return 'plant';
  return 'other';
}

export function typesForCategory(category) {
  return EQUIPMENT_TYPES_BY_CATEGORY[category] || [];
}

export function isValidCategoryType(category, equipmentType) {
  return typesForCategory(category).includes(equipmentType);
}

export function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalYear(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  if (n < 1950 || n > 2100) return null;
  return n;
}
