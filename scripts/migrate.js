import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon, Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

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

async function runSqlFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  console.log(`Running ${filePath}...`);
  await pool.query(content);
}

async function seedUsers() {
  console.log('Ensuring system user accounts exist...');
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'Demo@2026!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const users = [
    { id: 'f0000001-0001-4000-8000-000000000001', email: 'superadmin@ecwc.gov.et', name: 'Super Admin', role: 'super_admin' },
    { id: 'f0000001-0001-4000-8000-000000000002', email: 'ceo@ecwc.gov.et', name: 'CEO User', role: 'ceo' },
    { id: 'f0000001-0001-4000-8000-000000000003', email: 'manager@ecwc.gov.et', name: 'P&E Manager', role: 'pe_manager' },
    { id: 'f0000001-0001-4000-8000-000000000004', email: 'admin@ecwc.gov.et', name: 'P&E Admin', role: 'pe_admin' },
    { id: 'f0000001-0001-4000-8000-000000000005', email: 'projadmin@ecwc.gov.et', name: 'Project P&E Admin', role: 'project_pe_admin' },
    { id: 'f0000001-0001-4000-8000-000000000006', email: 'maintenance@ecwc.gov.et', name: 'P&E Maintenance', role: 'pe_maintenance' },
    { id: 'f0000001-0001-4000-8000-000000000007', email: 'projmaint@ecwc.gov.et', name: 'Project Maintenance', role: 'project_pe_maintenance' },
    { id: 'f0000001-0001-4000-8000-000000000008', email: 'insurance@ecwc.gov.et', name: 'Insurance Officer', role: 'insurance_officer' },
    { id: 'f0000001-0001-4000-8000-000000000009', email: 'production@ecwc.gov.et', name: 'Production Officer', role: 'production_officer' },
  ];

  for (const u of users) {
    await sql`
      INSERT INTO users (id, email, password_hash, name, role, project_id)
      VALUES (${u.id}, ${u.email}, ${passwordHash}, ${u.name}, ${u.role}::user_role, NULL)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW()
    `;
  }

  console.log('User accounts ready (new installs use DEFAULT_USER_PASSWORD or Demo@2026!)');
}

async function main() {
  const schemaDir = join(root, 'schema');
  const files = readdirSync(schemaDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    await runSqlFile(join(schemaDir, file));
  }

  await seedUsers();
  await pool.end();
  console.log('Migration complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
