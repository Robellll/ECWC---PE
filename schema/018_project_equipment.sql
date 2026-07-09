-- Project-based equipment: Kality/Central hub project + require project assignment

INSERT INTO projects (id, name, is_unassigned, sort_order)
VALUES ('a0000001-0001-4000-8000-000000000098', 'Kality/Central', false, 98)
ON CONFLICT (name) DO NOTHING;

UPDATE equipment
SET project_id = (SELECT id FROM projects WHERE name = 'Kality/Central' LIMIT 1)
WHERE project_id IS NULL;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE equipment SET status_updated_at = updated_at WHERE status_updated_at IS NULL;
