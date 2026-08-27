import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import {
  listManpowerStaff,
  mapManpowerStaff,
  seedManpowerFromDirectory,
} from '@/lib/manpower.js';
import { setActiveStaffDirectory } from '@/lib/garage-staff.js';
import { z } from 'zod';

const createSchema = z.object({
  employeeId: z.string().min(1),
  fullName: z.string().min(2),
  jobTitle: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request) {
  const { error } = await requirePermission((p) => p.canViewManpower);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === '1';
  const seed = searchParams.get('seed') === '1';

  if (seed) {
    const { error: editError } = await requirePermission((p) => p.canEditManpower);
    if (editError) return editError;
    await seedManpowerFromDirectory();
  }

  const staff = await listManpowerStaff({ activeOnly });
  setActiveStaffDirectory(staff.map((s) => ({
    id: s.employeeId,
    name: s.fullName,
    title: s.jobTitle,
  })));
  return jsonOk(staff);
}

export async function POST(request) {
  const { error } = await requirePermission((p) => p.canEditManpower);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input');

  const d = parsed.data;
  const employeeId = d.employeeId.trim();
  const fullName = d.fullName.trim();
  const jobTitle = (d.jobTitle || '').trim();
  const notes = (d.notes || '').trim();
  const isActive = d.isActive !== false;

  try {
    const rows = await sql`
      INSERT INTO manpower_staff (employee_id, full_name, job_title, notes, is_active)
      VALUES (${employeeId}, ${fullName}, ${jobTitle}, ${notes}, ${isActive})
      RETURNING *
    `;
    return jsonOk(mapManpowerStaff(rows[0]), 201);
  } catch (err) {
    if (String(err?.message || '').includes('unique') || err?.code === '23505') {
      return jsonError('Employee ID already exists', 409);
    }
    throw err;
  }
}
