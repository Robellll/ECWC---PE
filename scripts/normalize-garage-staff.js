/**
 * One-time backfill: convert garage staff fields from ID-only or name-only
 * into "Full Name (ID)" using the Central Garage staff directory.
 *
 * Usage: node scripts/normalize-garage-staff.js
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import {
  resolveStaffDisplay,
  resolveAssignedTechniciansField,
} from '../lib/garage-staff.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  const rows = await sql`
    SELECT id, receiving_inspector, assigned_technician, final_inspection_officer
    FROM garage_vehicles
  `;

  let updated = 0;
  for (const row of rows) {
    const receiving = resolveStaffDisplay(row.receiving_inspector || '');
    const assigned = resolveAssignedTechniciansField(row.assigned_technician || '');
    const finalOfficer = resolveStaffDisplay(row.final_inspection_officer || '');

    if (
      receiving === (row.receiving_inspector || '')
      && assigned === (row.assigned_technician || '')
      && finalOfficer === (row.final_inspection_officer || '')
    ) {
      continue;
    }

    await sql`
      UPDATE garage_vehicles SET
        receiving_inspector = ${receiving},
        assigned_technician = ${assigned},
        final_inspection_officer = ${finalOfficer},
        updated_at = NOW()
      WHERE id = ${row.id}
    `;
    updated += 1;
    console.log(`Updated ${row.id}`);
  }

  console.log(`Done. Normalized ${updated} of ${rows.length} garage vehicle(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
