import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const sql = neon(process.env.DATABASE_URL);
const dryRun = process.argv.includes('--dry-run');

const inactive = await sql`
  SELECT employee_id, full_name, updated_at
  FROM manpower_staff
  WHERE is_active = FALSE
  ORDER BY updated_at DESC
`;

console.log(`Inactive staff: ${inactive.length}`);
for (const row of inactive) {
  console.log(`- ${row.employee_id} ${row.full_name}`);
}

if (dryRun || inactive.length === 0) {
  process.exit(0);
}

const updated = await sql`
  UPDATE manpower_staff
  SET is_active = TRUE, updated_at = NOW()
  WHERE is_active = FALSE
  RETURNING employee_id, full_name
`;

console.log(`Reactivated: ${updated.length}`);
