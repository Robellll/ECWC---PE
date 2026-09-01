-- Production owns its projects; plants link to prod_projects only (not Contact Log)

ALTER TABLE prod_plants
  DROP CONSTRAINT IF EXISTS prod_plants_assigned_project_id_fkey;

ALTER TABLE prod_plant_projects
  DROP CONSTRAINT IF EXISTS prod_plant_projects_project_id_fkey;

-- Ensure prod_projects exist for plants currently assigned to main projects
INSERT INTO prod_projects (name, code, status)
SELECT DISTINCT p.name,
  'P' || SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8),
  'active'::prod_project_status
FROM prod_plants pl
JOIN projects p ON p.id = pl.assigned_project_id
WHERE NOT EXISTS (
  SELECT 1 FROM prod_projects pp
  WHERE LOWER(TRIM(pp.name)) = LOWER(TRIM(p.name))
);

-- Point plants at prod_projects (match by project name)
UPDATE prod_plants pl
SET assigned_project_id = pp.id
FROM projects p
JOIN prod_projects pp ON LOWER(TRIM(pp.name)) = LOWER(TRIM(p.name))
WHERE pl.assigned_project_id = p.id;

-- Plants already on prod_projects via linked_project_id
UPDATE prod_plants pl
SET assigned_project_id = pp.id
FROM prod_projects pp
WHERE pl.assigned_project_id = pp.linked_project_id
  AND pp.linked_project_id IS NOT NULL;

-- Plants already pointing at prod_projects ids — leave as-is
-- Clear orphans not in prod_projects
UPDATE prod_plants
SET assigned_project_id = NULL
WHERE assigned_project_id IS NOT NULL
  AND assigned_project_id NOT IN (SELECT id FROM prod_projects)
  AND assigned_project_id IN (SELECT id FROM projects);

-- Repoint plant–project links
DELETE FROM prod_plant_projects;

INSERT INTO prod_plant_projects (plant_id, project_id)
SELECT pl.id, pl.assigned_project_id
FROM prod_plants pl
WHERE pl.assigned_project_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE prod_plants
  ADD CONSTRAINT prod_plants_assigned_project_id_fkey
  FOREIGN KEY (assigned_project_id) REFERENCES prod_projects(id) ON DELETE SET NULL;

ALTER TABLE prod_plant_projects
  ADD CONSTRAINT prod_plant_projects_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES prod_projects(id) ON DELETE CASCADE;
