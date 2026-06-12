/**
 * Remove all operational/demo records from the database.
 * Keeps user accounts (emails + passwords) intact.
 */
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(root, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Clearing business data (users preserved)...');

  await pool.query('DELETE FROM insurance_progress_logs');
  await pool.query('DELETE FROM insurance_claims');
  await pool.query('DELETE FROM garage_progress_logs');
  await pool.query('DELETE FROM garage_vehicles');
  await pool.query('DELETE FROM equipment');
  await pool.query('DELETE FROM project_contacts');
  await pool.query('DELETE FROM projects WHERE NOT is_unassigned');

  await pool.query(`
  INSERT INTO projects (id, name, is_unassigned, sort_order) VALUES
    ('a0000001-0001-4000-8000-000000000099', 'Idle / Unassigned Managers', true, 99)
  ON CONFLICT (name) DO NOTHING
  `);

  await pool.query(`
    UPDATE users SET project_id = NULL
    WHERE project_id IS NOT NULL
      AND project_id NOT IN (SELECT id FROM projects)
  `);

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM projects) AS projects,
      (SELECT COUNT(*)::int FROM project_contacts) AS contacts,
      (SELECT COUNT(*)::int FROM equipment) AS equipment,
      (SELECT COUNT(*)::int FROM garage_vehicles) AS garage,
      (SELECT COUNT(*)::int FROM insurance_claims) AS insurance
  `);

  const c = counts.rows[0];
  console.log('Done. Remaining rows:');
  console.log(`  users: ${c.users}`);
  console.log(`  projects: ${c.projects} (system unassigned row only)`);
  console.log(`  contacts: ${c.contacts}`);
  console.log(`  equipment: ${c.equipment}`);
  console.log(`  garage: ${c.garage}`);
  console.log(`  insurance: ${c.insurance}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Clear failed:', err);
  process.exit(1);
});
