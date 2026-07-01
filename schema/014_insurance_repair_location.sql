-- Insurance Under Maintenance: Central vs Outsource repair location

DO $$ BEGIN
  CREATE TYPE insurance_repair_location AS ENUM ('central', 'outsource');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE insurance_claims
  ADD COLUMN IF NOT EXISTS repair_location insurance_repair_location;

ALTER TABLE insurance_claims
  ADD COLUMN IF NOT EXISTS outsource_garage_name TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_insurance_claims_repair_location
  ON insurance_claims(repair_location)
  WHERE repair_location IS NOT NULL;
