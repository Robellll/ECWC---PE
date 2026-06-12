-- System-only seed: unassigned swimlane required by Contact Log (Kanban).
INSERT INTO projects (id, name, is_unassigned, sort_order) VALUES
  ('a0000001-0001-4000-8000-000000000099', 'Idle / Unassigned Managers', true, 99)
ON CONFLICT (name) DO NOTHING;
