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
  console.log('Seeding demo users...');
  const passwordHash = await bcrypt.hash('Demo@2026!', 10);
  const users = [
    { id: 'f0000001-0001-4000-8000-000000000001', email: 'superadmin@ecwc.gov.et', name: 'Super Admin', role: 'super_admin', project_id: null },
    { id: 'f0000001-0001-4000-8000-000000000002', email: 'ceo@ecwc.gov.et', name: 'CEO User', role: 'ceo', project_id: null },
    { id: 'f0000001-0001-4000-8000-000000000003', email: 'manager@ecwc.gov.et', name: 'P&E Manager', role: 'pe_manager', project_id: null },
    { id: 'f0000001-0001-4000-8000-000000000004', email: 'admin@ecwc.gov.et', name: 'P&E Admin', role: 'pe_admin', project_id: null },
    { id: 'f0000001-0001-4000-8000-000000000005', email: 'projadmin@ecwc.gov.et', name: 'Project P&E Admin', role: 'project_pe_admin', project_id: 'a0000001-0001-4000-8000-000000000001' },
    { id: 'f0000001-0001-4000-8000-000000000006', email: 'maintenance@ecwc.gov.et', name: 'P&E Maintenance', role: 'pe_maintenance', project_id: null },
    { id: 'f0000001-0001-4000-8000-000000000007', email: 'projmaint@ecwc.gov.et', name: 'Project Maintenance', role: 'project_pe_maintenance', project_id: 'a0000001-0001-4000-8000-000000000002' },
    { id: 'f0000001-0001-4000-8000-000000000008', email: 'insurance@ecwc.gov.et', name: 'Insurance Officer', role: 'insurance_officer', project_id: null },
  ];

  for (const u of users) {
    await sql`
      INSERT INTO users (id, email, password_hash, name, role, project_id)
      VALUES (${u.id}, ${u.email}, ${passwordHash}, ${u.name}, ${u.role}::user_role, ${u.project_id})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        project_id = EXCLUDED.project_id,
        updated_at = NOW()
    `;
  }

  await sql`
    UPDATE equipment SET added_by_user_id = 'f0000001-0001-4000-8000-000000000005'
    WHERE added_by_user_id IS NULL
  `;

  console.log('Demo users seeded (password: Demo@2026!)');
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
