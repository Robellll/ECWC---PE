/**
 * Create manpower_staff table (if needed) and seed from the built-in directory.
 * Usage: node scripts/seed-manpower.js
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { Pool, neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { GARAGE_STAFF_DIRECTORY } from '../lib/garage-staff.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const sql = neon(DATABASE_URL);

async function main() {
  const schemaPath = join(root, 'schema', '023_manpower_staff.sql');
  console.log('Applying schema…');
  await pool.query(readFileSync(schemaPath, 'utf8'));

  let upserted = 0;
  for (const member of GARAGE_STAFF_DIRECTORY) {
    const rows = await sql`
      INSERT INTO manpower_staff (employee_id, full_name, job_title, is_active)
      VALUES (${member.id}, ${member.name}, ${member.title || ''}, TRUE)
      ON CONFLICT (employee_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        job_title = EXCLUDED.job_title,
        updated_at = NOW()
      RETURNING id
    `;
    if (rows[0]) upserted += 1;
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM manpower_staff`;
  console.log(`Seeded/updated ${upserted} staff. Table now has ${count} rows.`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
