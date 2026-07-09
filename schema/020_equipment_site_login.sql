-- Per-project site equipment register login (project P&E admin at site)

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS equipment_site_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipment_site_email TEXT,
  ADD COLUMN IF NOT EXISTS equipment_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_projects_equipment_site_user_id ON projects(equipment_site_user_id);
