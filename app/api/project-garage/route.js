import { sql } from '@/lib/db.js';
import { requireSession, jsonOk } from '@/lib/api-helpers.js';
import { mapProject, mapContact } from '@/lib/mappers.js';
import { getRolePermissions } from '@/lib/permissions.js';
import { canViewProjectGarage } from '@/lib/garage-access.js';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const perms = getRolePermissions(session.user.role);

  const projects = await sql`
    SELECT
      p.*,
      COUNT(gv.id) FILTER (WHERE gv.status = 'in_progress')::int AS in_progress_count,
      COUNT(gv.id) FILTER (WHERE gv.status = 'completed')::int AS completed_count,
      COUNT(gv.id)::int AS total_jobs
    FROM projects p
    LEFT JOIN garage_vehicles gv
      ON gv.project_id = p.id AND gv.garage_scope = 'project'
    WHERE NOT p.is_unassigned
    GROUP BY p.id
    ORDER BY p.sort_order, p.name
  `;

  const contacts = await sql`SELECT * FROM project_contacts ORDER BY sort_order`;
  const contactsByProject = contacts.reduce((acc, row) => {
    const mapped = mapContact(row);
    if (!acc[mapped.projectId]) acc[mapped.projectId] = [];
    acc[mapped.projectId].push(mapped);
    return acc;
  }, {});

  const visible = projects
    .filter((p) => canViewProjectGarage(session, perms, p.id))
    .map((p) => {
      const projectContacts = contactsByProject[p.id] || [];
      return mapProject(p, {
        adminContact: projectContacts.find((c) => c.role === 'admin') || null,
        maintenanceContact: projectContacts.find((c) => c.role === 'maintenance') || null,
      });
    });

  return jsonOk(visible);
}
