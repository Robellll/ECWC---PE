import { sql } from '@/lib/db.js';

function baseCode(name) {
  const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return slug.slice(0, 8) || 'PROJ';
}

/** Find or create a production project by name (name-only setup). */
export async function ensureProdProject(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const existing = await sql`
    SELECT id FROM prod_projects
    WHERE LOWER(TRIM(name)) = LOWER(${trimmed})
    LIMIT 1
  `;
  if (existing[0]) return existing[0].id;

  let code = baseCode(trimmed);
  let attempt = code;
  let n = 1;
  while (true) {
    const clash = await sql`SELECT id FROM prod_projects WHERE code = ${attempt} LIMIT 1`;
    if (!clash[0]) break;
    attempt = `${code.slice(0, 6)}${n}`;
    n += 1;
  }

  const rows = await sql`
    INSERT INTO prod_projects (name, code, status)
    VALUES (${trimmed}, ${attempt}, 'active'::prod_project_status)
    RETURNING id
  `;
  return rows[0].id;
}

/** Link a plant to a production project by name; creates project if needed. */
export async function assignPlantToProject(plantId, projectName) {
  const projectId = await ensureProdProject(projectName);
  if (!projectId) return null;

  await sql`
    UPDATE prod_plants
    SET assigned_project_id = ${projectId}, updated_at = NOW()
    WHERE id = ${plantId}
  `;
  await sql`
    INSERT INTO prod_plant_projects (plant_id, project_id)
    VALUES (${plantId}, ${projectId})
    ON CONFLICT DO NOTHING
  `;
  return projectId;
}
