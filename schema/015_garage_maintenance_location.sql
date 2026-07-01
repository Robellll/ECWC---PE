-- Garage maintenance location: where under-maintenance work happens

DO $$ BEGIN
  CREATE TYPE garage_maintenance_location AS ENUM ('on_site', 'central', 'outsource');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE garage_vehicles
  ADD COLUMN IF NOT EXISTS maintenance_location garage_maintenance_location;

ALTER TABLE garage_vehicles
  ADD COLUMN IF NOT EXISTS outsource_garage_name TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_garage_vehicles_maintenance_location
  ON garage_vehicles(maintenance_location)
  WHERE maintenance_location IS NOT NULL;
