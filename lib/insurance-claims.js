import { sql } from '@/lib/db.js';
import { mapInsuranceClaim } from '@/lib/mappers.js';

export async function fetchInsuranceClaimWithLogs(id) {
  const rows = await sql`
    SELECT c.*, COALESCE(NULLIF(TRIM(c.project_name), ''), p.name, '') AS project_name
    FROM insurance_claims c
    LEFT JOIN projects p ON p.id = c.project_id
    WHERE c.id = ${id}
  `;
  if (!rows[0]) return null;
  const logs = await sql`SELECT * FROM insurance_progress_logs WHERE claim_id = ${id} ORDER BY created_at`;
  return mapInsuranceClaim(rows[0], logs);
}
