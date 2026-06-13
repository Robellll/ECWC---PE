-- Central Garage enhancement: workshops, SRO, staff accountability, workflow stages

DO $$ BEGIN
  CREATE TYPE garage_workshop AS ENUM (
    'auxiliary_equipment',
    'electrical_electronics',
    'electromechanical',
    'engine',
    'factory_equipment',
    'heavy_machinery',
    'heavy_vehicle',
    'light_vehicle',
    'service_wash_grease_tire',
    'vehicle_body_painting'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE garage_vehicles ADD COLUMN IF NOT EXISTS sro_number TEXT NOT NULL DEFAULT '';
ALTER TABLE garage_vehicles ADD COLUMN IF NOT EXISTS receiving_inspector TEXT NOT NULL DEFAULT '';
ALTER TABLE garage_vehicles ADD COLUMN IF NOT EXISTS final_inspection_officer TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'garage_vehicles' AND column_name = 'workshop'
  ) THEN
    ALTER TABLE garage_vehicles ADD COLUMN workshop garage_workshop;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'garage_vehicles' AND column_name = 'technician'
  ) THEN
    ALTER TABLE garage_vehicles RENAME COLUMN technician TO assigned_technician;
  END IF;
END $$;

ALTER TABLE garage_vehicles ADD COLUMN IF NOT EXISTS assigned_technician TEXT NOT NULL DEFAULT '';

-- Migrate garage_stage enum to new workflow if old values still exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'garage_stage' AND e.enumlabel = 'diagnosing'
  ) THEN
    ALTER TYPE garage_stage RENAME TO garage_stage_old;

    CREATE TYPE garage_stage AS ENUM (
      'received',
      'under_maintenance',
      'final_inspection',
      'completed'
    );

    ALTER TABLE garage_vehicles ALTER COLUMN stage DROP DEFAULT;

    ALTER TABLE garage_vehicles
      ALTER COLUMN stage TYPE garage_stage
      USING (
        CASE stage::text
          WHEN 'received' THEN 'received'::garage_stage
          WHEN 'diagnosing' THEN 'under_maintenance'::garage_stage
          WHEN 'in_repair' THEN 'under_maintenance'::garage_stage
          WHEN 'testing' THEN 'final_inspection'::garage_stage
          WHEN 'completed' THEN 'completed'::garage_stage
          ELSE 'received'::garage_stage
        END
      );

    ALTER TABLE garage_vehicles ALTER COLUMN stage SET DEFAULT 'received'::garage_stage;
    DROP TYPE garage_stage_old;
  END IF;
END $$;
