-- Store project as free text on insurance claims
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT '';

UPDATE insurance_claims c
SET project_name = p.name
FROM projects p
WHERE c.project_id = p.id
  AND (c.project_name IS NULL OR TRIM(c.project_name) = '');
