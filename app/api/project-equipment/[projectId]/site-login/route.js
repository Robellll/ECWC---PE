import { sql } from '@/lib/db.js';
import { requirePermission, jsonOk, jsonError } from '@/lib/api-helpers.js';
import {
  defaultEquipmentSiteEmail,
  defaultEquipmentSiteDisplayName,
  EQUIPMENT_SITE_LOGIN_ROLE,
} from '@/lib/project-site-login.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const upsertSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

async function getProject(projectId) {
  const rows = await sql`
    SELECT
      p.*,
      u.id AS site_user_id,
      u.email AS site_user_email,
      u.name AS site_user_name,
      u.updated_at AS site_user_updated_at
    FROM projects p
    LEFT JOIN users u ON u.id = p.equipment_site_user_id
    WHERE p.id = ${projectId} AND NOT p.is_unassigned
  `;
  return rows[0] || null;
}

function mapSiteLogin(project) {
  if (!project) return null;
  return {
    projectId: project.id,
    projectName: project.name,
    enabled: Boolean(project.equipment_enabled),
    email: project.equipment_site_email || project.site_user_email || '',
    user: project.site_user_id
      ? {
          id: project.site_user_id,
          email: project.site_user_email,
          name: project.site_user_name,
          updatedAt: project.site_user_updated_at,
        }
      : null,
  };
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission((p) => p.isUserAdmin);
  if (error) return error;
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) return jsonError('Project not found', 404);
  return jsonOk(mapSiteLogin(project));
}

export async function POST(request, { params }) {
  const { error } = await requirePermission((p) => p.isUserAdmin);
  if (error) return error;
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) return jsonError('Project not found', 404);

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid input — password must be at least 8 characters');

  const d = parsed.data;
  const email = (d.email || project.equipment_site_email || defaultEquipmentSiteEmail(project.name)).trim().toLowerCase();
  const displayName = (d.name || project.site_user_name || defaultEquipmentSiteDisplayName(project.name)).trim();
  const passwordHash = await bcrypt.hash(d.password, 10);

  try {
    let userId = project.equipment_site_user_id;

    if (userId) {
      const emailTaken = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${userId}
      `;
      if (emailTaken[0]) return jsonError('Email already used by another account', 409);

      await sql`
        UPDATE users SET
          email = ${email},
          password_hash = ${passwordHash},
          name = ${displayName},
          role = ${EQUIPMENT_SITE_LOGIN_ROLE}::user_role,
          project_id = ${projectId},
          updated_at = NOW()
        WHERE id = ${userId}
      `;
    } else {
      const existingByEmail = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existingByEmail[0]) {
        userId = existingByEmail[0].id;
        await sql`
          UPDATE users SET
            password_hash = ${passwordHash},
            name = ${displayName},
            role = ${EQUIPMENT_SITE_LOGIN_ROLE}::user_role,
            project_id = ${projectId},
            updated_at = NOW()
          WHERE id = ${userId}
        `;
      } else {
        const created = await sql`
          INSERT INTO users (email, password_hash, name, role, project_id)
          VALUES (${email}, ${passwordHash}, ${displayName}, ${EQUIPMENT_SITE_LOGIN_ROLE}::user_role, ${projectId})
          RETURNING id
        `;
        userId = created[0].id;
      }
    }

    await sql`
      UPDATE projects SET
        equipment_enabled = TRUE,
        equipment_site_email = ${email},
        equipment_site_user_id = ${userId}
      WHERE id = ${projectId}
    `;

    const updated = await getProject(projectId);
    return jsonOk({
      ...mapSiteLogin(updated),
      message: project.equipment_site_user_id ? 'Equipment site login password updated.' : 'Equipment site login created.',
    });
  } catch (e) {
    if (e.message?.includes('unique')) return jsonError('Email already exists', 409);
    throw e;
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission((p) => p.isUserAdmin);
  if (error) return error;
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) return jsonError('Project not found', 404);

  await sql`
    UPDATE projects SET equipment_enabled = FALSE WHERE id = ${projectId}
  `;

  const updated = await getProject(projectId);
  return jsonOk({
    ...mapSiteLogin(updated),
    message: 'Equipment site login disabled. Re-enable by setting a new password.',
  });
}
