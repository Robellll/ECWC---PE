/**
 * Apply the hr_coordinator role and create/refresh the HR Coordinator login.
 *
 *   node scripts/create-hr-user.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env') });

const EMAIL = 'hr@ecwc.gov.et';
const PASSWORD = process.env.HR_USER_PASSWORD || 'hr@321';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(readFileSync(join(root, 'schema/030_hr_coordinator_role.sql'), 'utf8'));
  console.log('Role hr_coordinator is available');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (id, email, password_hash, name, role, project_id)
     VALUES ($1, $2, $3, $4, 'hr_coordinator'::user_role, NULL)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       password_hash = EXCLUDED.password_hash
     RETURNING id, email, name, role`,
    ['f0000001-0001-4000-8000-00000000000b', EMAIL, passwordHash, 'HR Coordinator'],
  );
  console.log('HR account ready:', rows[0]);
} finally {
  await pool.end();
}
