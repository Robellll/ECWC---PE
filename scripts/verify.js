import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(root, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const tables = ['users', 'projects', 'project_contacts', 'equipment', 'garage_vehicles', 'insurance_claims'];
  console.log('--- Database counts ---');
  for (const t of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
    console.log(`${t}: ${rows[0].c}`);
  }

  const { rows: users } = await pool.query(`SELECT email, role FROM users ORDER BY email`);
  console.log('\n--- Demo users ---');
  users.forEach((u) => console.log(`  ${u.email} (${u.role})`));

  const { rows: hashRow } = await pool.query(`SELECT password_hash FROM users WHERE email = 'superadmin@ecwc.gov.et'`);
  const ok = await bcrypt.compare('Demo@2026!', hashRow[0].password_hash);
  console.log(`\nPassword check Demo@2026!: ${ok ? 'PASS' : 'FAIL'}`);

  await pool.end();
  console.log('\nVerification complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
