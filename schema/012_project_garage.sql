-- Project Garage: site maintenance linked to Contact Log projects

DO $$ BEGIN
  CREATE TYPE garage_scope AS ENUM ('central', 'project');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE garage_vehicles
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE garage_vehicles
  ADD COLUMN IF NOT EXISTS garage_scope garage_scope NOT NULL DEFAULT 'central';

ALTER TABLE garage_vehicles
  ADD COLUMN IF NOT EXISTS site_operator_name TEXT NOT NULL DEFAULT '';

UPDATE garage_vehicles
SET garage_scope = 'central'
WHERE project_id IS NULL;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS garage_site_email TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS garage_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_garage_vehicles_project_id ON garage_vehicles(project_id);
CREATE INDEX IF NOT EXISTS idx_garage_vehicles_garage_scope ON garage_vehicles(garage_scope);
