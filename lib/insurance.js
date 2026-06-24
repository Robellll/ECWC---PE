export const ACCIDENT_TYPES = [
  { value: 'collision', label: 'Collision' },
  { value: 'rollover', label: 'Rollover' },
  { value: 'other', label: 'Other' },
];

export const INSURANCE_DOC_FIELDS = [
  { key: 'policeReport', label: 'Police Report' },
  { key: 'accidentForm', label: 'Accident Form' },
  { key: 'licenseDoc', label: 'License' },
];

const ACCIDENT_TYPE_LABELS = Object.fromEntries(
  ACCIDENT_TYPES.map((t) => [t.value, t.label]),
);

export function accidentTypeLabel(value) {
  return ACCIDENT_TYPE_LABELS[value] || value || '—';
}

/** Whole days elapsed since accident (frozen at completion date when provided). */
export function getDaysSinceAccident(accidentDate, endDate = null) {
  const start = new Date(accidentDate);
  if (Number.isNaN(start.getTime())) return 0;
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** fresh: 0–15 days, warning: 16–30, overdue: 31+ */
export function getDaysSinceTier(days) {
  if (days <= 15) return 'fresh';
  if (days <= 30) return 'warning';
  return 'overdue';
}

export function formatDaysSinceLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function claimToEditForm(claim) {
  const typeEntry = ACCIDENT_TYPES.find((t) => t.label === claim.accidentType);
  const accidentDate = claim.accidentDate ? new Date(claim.accidentDate) : new Date();
  let dateStr = new Date().toISOString().slice(0, 10);
  if (!Number.isNaN(accidentDate.getTime())) {
    const y = accidentDate.getFullYear();
    const m = String(accidentDate.getMonth() + 1).padStart(2, '0');
    const day = String(accidentDate.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${day}`;
  }
  return {
    vehicleType: claim.vehicleType || '',
    plate: claim.plate || '',
    projectName: claim.projectName || '',
    driverOperator: claim.driverOperator || '',
    accidentDate: dateStr,
    policeReport: Boolean(claim.policeReport),
    accidentForm: Boolean(claim.accidentForm),
    licenseDoc: Boolean(claim.licenseDoc),
    accidentType: typeEntry?.value || 'collision',
    accidentTypeOther: claim.accidentTypeOther || '',
    accidentDescription: claim.accidentDescription || '',
    accidentPhoto: claim.accidentPhoto || null,
    photoPreview: claim.accidentPhoto || null,
    photoChanged: false,
    clearPhoto: false,
  };
}

export function isValidStaffName(name) {
  return typeof name === 'string' && name.trim().length >= 2;
}

export function isValidCompensation(amount) {
  const n = Number(amount);
  return Number.isFinite(n) && n >= 0;
}

export function formatCompensation(amount) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return `${n.toLocaleString('en-ET')} ETB`;
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function validateAccidentPhoto(dataUrl) {
  if (!dataUrl) return { ok: true, value: null };
  if (typeof dataUrl !== 'string') return { ok: false, error: 'Invalid photo data' };
  if (!dataUrl.startsWith('data:image/')) {
    return { ok: false, error: 'Photo must be a JPEG, PNG, or WebP image' };
  }
  const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
  if (approxBytes > MAX_PHOTO_BYTES) {
    return { ok: false, error: 'Photo must be 2 MB or smaller' };
  }
  return { ok: true, value: dataUrl };
}

export async function readImageFileAsDataUrl(file) {
  if (!file) return null;
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Photo must be JPEG, PNG, or WebP');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('Photo must be 2 MB or smaller');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read photo file'));
    reader.readAsDataURL(file);
  });
}
