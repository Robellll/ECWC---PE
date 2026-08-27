import { sql } from '@/lib/db.js';
import { GARAGE_STAFF_DIRECTORY } from '@/lib/garage-staff.js';

export function mapManpowerStaff(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    fullName: row.full_name,
    jobTitle: row.job_title || '',
    isActive: row.is_active !== false,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Directory shape used by garage ID lookup */
export function toDirectoryMember(row) {
  return {
    id: row.employee_id || row.id,
    name: row.full_name || row.name,
    title: row.job_title || row.title || '',
  };
}

export async function listManpowerStaff({ activeOnly = false } = {}) {
  const rows = activeOnly
    ? await sql`
        SELECT * FROM manpower_staff
        WHERE is_active = TRUE
        ORDER BY full_name ASC
      `
    : await sql`
        SELECT * FROM manpower_staff
        ORDER BY is_active DESC, full_name ASC
      `;
  return rows.map(mapManpowerStaff);
}

export async function getManpowerDirectory() {
  const rows = await sql`
    SELECT employee_id, full_name, job_title
    FROM manpower_staff
    WHERE is_active = TRUE
    ORDER BY full_name ASC
  `;
  if (rows.length > 0) {
    return rows.map(toDirectoryMember);
  }
  // Fallback before first seed
  return GARAGE_STAFF_DIRECTORY;
}

export async function seedManpowerFromDirectory() {
  let inserted = 0;
  for (const member of GARAGE_STAFF_DIRECTORY) {
    const rows = await sql`
      INSERT INTO manpower_staff (employee_id, full_name, job_title, is_active)
      VALUES (${member.id}, ${member.name}, ${member.title || ''}, TRUE)
      ON CONFLICT (employee_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        job_title = EXCLUDED.job_title,
        updated_at = NOW()
      WHERE manpower_staff.full_name IS DISTINCT FROM EXCLUDED.full_name
         OR manpower_staff.job_title IS DISTINCT FROM EXCLUDED.job_title
      RETURNING id
    `;
    if (rows[0]) inserted += 1;
  }
  return { total: GARAGE_STAFF_DIRECTORY.length, upserted: inserted };
}

/**
 * Performance for central garage work attributed to each staff member.
 * Matches Name (ID) and legacy ID-only / comma-separated values.
 */
export async function getManpowerPerformance({ from = null, to = null } = {}) {
  const staff = await listManpowerStaff({ activeOnly: false });
  const vehicles = await sql`
    SELECT
      assigned_technician,
      receiving_inspector,
      final_inspection_officer,
      status,
      registered_at,
      completed_at
    FROM garage_vehicles
    WHERE garage_scope = 'central'
      AND (${from}::timestamptz IS NULL OR registered_at >= ${from}::timestamptz)
      AND (${to}::timestamptz IS NULL OR registered_at <= ${to}::timestamptz)
  `;

  const stats = staff.map((person) => ({
    ...person,
    asMechanic: 0,
    asMechanicCompleted: 0,
    asReceivingInspector: 0,
    asFinalInspector: 0,
    totalJobs: 0,
  }));

  const byEmployeeId = new Map();
  for (const s of stats) {
    byEmployeeId.set(normalizeId(s.employeeId), s);
  }

  for (const v of vehicles) {
    const completed = v.status === 'completed';
    for (const id of extractStaffIds(v.assigned_technician)) {
      const row = byEmployeeId.get(normalizeId(id));
      if (!row) continue;
      row.asMechanic += 1;
      if (completed) row.asMechanicCompleted += 1;
    }
    for (const id of extractStaffIds(v.receiving_inspector)) {
      const row = byEmployeeId.get(normalizeId(id));
      if (row) row.asReceivingInspector += 1;
    }
    for (const id of extractStaffIds(v.final_inspection_officer)) {
      const row = byEmployeeId.get(normalizeId(id));
      if (row) row.asFinalInspector += 1;
    }
  }

  for (const row of stats) {
    row.totalJobs = row.asMechanic + row.asReceivingInspector + row.asFinalInspector;
  }

  stats.sort((a, b) => b.totalJobs - a.totalJobs || a.fullName.localeCompare(b.fullName));

  const totals = {
    staff: stats.length,
    activeStaff: stats.filter((s) => s.isActive).length,
    jobsInRange: vehicles.length,
    completedInRange: vehicles.filter((v) => v.status === 'completed').length,
    withActivity: stats.filter((s) => s.totalJobs > 0).length,
  };

  return { totals, staff: stats };
}

function normalizeId(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '') || '0';
}

function extractStaffIds(raw) {
  if (!raw) return [];
  const text = String(raw);
  const ids = new Set();

  for (const match of text.matchAll(/\((\d+)\)/g)) {
    ids.add(match[1]);
  }

  const parts = text.split(/[\n;,]+|\s+&\s+/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (/^\d+$/.test(part)) ids.add(part);
  }

  return [...ids];
}
