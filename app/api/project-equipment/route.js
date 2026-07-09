import { sql } from '@/lib/db.js';
import { requireSession, jsonOk } from '@/lib/api-helpers.js';
import { mapProject, mapContact } from '@/lib/mappers.js';
import { getRolePermissions } from '@/lib/permissions.js';
import { canViewProjectEquipment } from '@/lib/equipment-access.js';

function fleetTotals(rows) {
  return rows.reduce(
    (acc, p) => ({
      total: acc.total + p.equipmentTotal,
      operable: acc.operable + p.equipmentOperable,
      idle: acc.idle + p.equipmentIdle,
      down: acc.down + p.equipmentDown,
    }),
    { total: 0, operable: 0, idle: 0, down: 0 },
  );
}

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;
  const perms = getRolePermissions(session.user.role);

  const projects = await sql`
    SELECT
      p.*,
      COUNT(e.id)::int AS equipment_total,
      COUNT(e.id) FILTER (WHERE e.status = 'operational')::int AS equipment_operable,
      COUNT(e.id) FILTER (WHERE e.status = 'idle')::int AS equipment_idle,
      COUNT(e.id) FILTER (WHERE e.status IN ('breakdown', 'under_maintenance'))::int AS equipment_down
    FROM projects p
    LEFT JOIN equipment e ON e.project_id = p.id
    WHERE NOT p.is_unassigned
    GROUP BY p.id
    ORDER BY LOWER(p.name) ASC
  `;

  const contacts = await sql`SELECT * FROM project_contacts ORDER BY sort_order`;
  const contactsByProject = contacts.reduce((acc, row) => {
    const mapped = mapContact(row);
    if (!acc[mapped.projectId]) acc[mapped.projectId] = [];
    acc[mapped.projectId].push(mapped);
    return acc;
  }, {});

  const visible = projects
    .filter((p) => canViewProjectEquipment(session, perms, p.id))
    .map((p) => {
      const projectContacts = contactsByProject[p.id] || [];
      return mapProject(p, {
        adminContact: projectContacts.find((c) => c.role === 'admin') || null,
        maintenanceContact: projectContacts.find((c) => c.role === 'maintenance') || null,
      });
    });

  return jsonOk({
    fleet: fleetTotals(visible),
    projects: visible,
  });
}
