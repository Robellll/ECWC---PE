-- Link each project to its dedicated site garage login user

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS garage_site_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_garage_site_user_id ON projects(garage_site_user_id);
