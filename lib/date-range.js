import { startOfDay, endOfDay } from 'date-fns';

/** Normalize range so from <= to */
export function normalizeRange(range) {
  if (!range?.from) return { from: undefined, to: undefined };
  if (!range.to) return { from: range.from, to: undefined };
  if (range.from <= range.to) return range;
  return { from: range.to, to: range.from };
}

export function isRangeComplete(range) {
  return Boolean(range?.from && range?.to);
}

export function formatRangeLabel(range) {
  if (!range?.from) return 'Select dates';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const fromStr = range.from.toLocaleDateString('en-GB', opts);
  if (!range.to) return `${fromStr} — …`;
  const toStr = range.to.toLocaleDateString('en-GB', opts);
  if (fromStr === toStr) return fromStr;
  return `${fromStr} – ${toStr}`;
}

export function isDateInRange(dateValue, range) {
  if (!isRangeComplete(range)) return true;
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  const start = startOfDay(range.from);
  const end = endOfDay(range.to);
  return d >= start && d <= end;
}

export function isRegisteredInRange(record, range) {
  return isDateInRange(record.registeredDate, range);
}

export function isAccidentInRange(claim, range) {
  return isDateInRange(claim.accidentDate, range);
}

export function isCompletedInRange(vehicle, range) {
  if (!isRangeComplete(range)) return true;
  if (vehicle.status !== 'Completed' || !vehicle.completedDate) return false;
  return isDateInRange(vehicle.completedDate, range);
}
