import { isValidStaffName } from './garage.js';
import {
  resolveStaffDisplay,
  resolveAssignedTechniciansField,
  splitStaffEntries,
} from './garage-staff.js';

/** Stored in assigned_technician — one technician per line. */
export const TECHNICIAN_LINE_SEP = '\n';

export function parseAssignedTechnicians(value) {
  if (!value || typeof value !== 'string') return [];
  return splitStaffEntries(value)
    .map((s) => resolveStaffDisplay(s.trim()))
    .filter(Boolean);
}

export function serializeAssignedTechnicians(list) {
  return (Array.isArray(list) ? list : [])
    .map((s) => resolveStaffDisplay(String(s ?? '').trim()))
    .filter(Boolean)
    .join(TECHNICIAN_LINE_SEP);
}

export function formatTechniciansDisplay(value) {
  const list = Array.isArray(value) ? value : parseAssignedTechnicians(value);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return list.join(', ');
}

export function isValidTechnicianList(list) {
  const entries = (Array.isArray(list) ? list : parseAssignedTechnicians(list))
    .map((s) => s.trim())
    .filter(Boolean);
  return entries.length > 0 && entries.every(isValidStaffName);
}

export function normalizeTechnicianList(list) {
  const cleaned = (Array.isArray(list) ? list : [])
    .map((s) => resolveStaffDisplay(String(s ?? '').trim()))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : [''];
}

export { resolveAssignedTechniciansField };
