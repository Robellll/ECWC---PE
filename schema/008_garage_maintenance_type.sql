-- Add maintenance type (Major / Minor) to garage vehicles

DO $$ BEGIN
  CREATE TYPE garage_maintenance_type AS ENUM ('major', 'minor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE garage_vehicles
  ADD COLUMN IF NOT EXISTS maintenance_type garage_maintenance_type;
