-- Insurance module: new registration fields, workflow stages, remove legacy columns

DO $$ BEGIN
  CREATE TYPE accident_type AS ENUM ('collision', 'rollover', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS driver_operator TEXT DEFAULT '';
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS police_report BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS accident_form BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS license_doc BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS accident_type accident_type;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS accident_type_other TEXT DEFAULT '';
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS accident_photo TEXT;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS final_inspector_name TEXT DEFAULT '';
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS compensation_amount NUMERIC;
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_claims' AND column_name = 'model'
  ) THEN
    UPDATE insurance_claims SET vehicle_type = model WHERE vehicle_type IS NULL AND model IS NOT NULL;
  END IF;
END $$;
UPDATE insurance_claims SET vehicle_type = 'Vehicle' WHERE vehicle_type IS NULL OR TRIM(vehicle_type) = '';

-- Migrate insurance_stage enum to new workflow
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'insurance_stage' AND e.enumlabel = 'inspection'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'insurance_stage' AND e.enumlabel = 'reported_notified'
  ) THEN
    ALTER TYPE insurance_stage RENAME TO insurance_stage_old;

    CREATE TYPE insurance_stage AS ENUM (
      'reported_notified',
      'document_pending',
      'insurance_inspection',
      'bid',
      'under_maintenance',
      'completed'
    );

    ALTER TABLE insurance_claims ALTER COLUMN stage DROP DEFAULT;

    ALTER TABLE insurance_claims
      ALTER COLUMN stage TYPE insurance_stage
      USING (
        CASE stage::text
          WHEN 'reported' THEN 'reported_notified'::insurance_stage
          WHEN 'documents_pending' THEN 'document_pending'::insurance_stage
          WHEN 'inspection' THEN 'insurance_inspection'::insurance_stage
          WHEN 'approved' THEN 'bid'::insurance_stage
          WHEN 'payout_received' THEN 'under_maintenance'::insurance_stage
          WHEN 'closed' THEN 'completed'::insurance_stage
          ELSE 'reported_notified'::insurance_stage
        END
      );

    ALTER TABLE insurance_claims ALTER COLUMN stage SET DEFAULT 'reported_notified'::insurance_stage;
    DROP TYPE insurance_stage_old;
  END IF;
END $$;

ALTER TABLE insurance_claims DROP CONSTRAINT IF EXISTS insurance_claims_claim_number_key;
ALTER TABLE insurance_claims DROP COLUMN IF EXISTS claim_number;
ALTER TABLE insurance_claims DROP COLUMN IF EXISTS insurance_provider;
ALTER TABLE insurance_claims DROP COLUMN IF EXISTS estimated_cost;
ALTER TABLE insurance_claims DROP COLUMN IF EXISTS priority;
ALTER TABLE insurance_claims DROP COLUMN IF EXISTS model;

UPDATE insurance_claims SET accident_type = 'other'::accident_type WHERE accident_type IS NULL;
