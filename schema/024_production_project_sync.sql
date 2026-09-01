-- Sync production plant assignments with main projects; move location to projects

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';

ALTER TABLE prod_projects
  ADD COLUMN IF NOT EXISTS linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Link existing production projects to main projects by name
UPDATE prod_projects pp
SET linked_project_id = p.id
FROM projects p
WHERE pp.linked_project_id IS NULL
  AND NOT p.is_unassigned
  AND LOWER(TRIM(p.name)) = LOWER(TRIM(pp.name));

-- Move plant location onto the assigned main project
UPDATE projects p
SET location = pl.location
FROM prod_plants pl
JOIN prod_projects pp ON pp.id = pl.assigned_project_id
JOIN projects mp ON mp.id = pp.linked_project_id
WHERE p.id = mp.id
  AND TRIM(pl.location) <> ''
  AND TRIM(COALESCE(p.location, '')) = '';

-- Move production project location onto linked main project
UPDATE projects p
SET location = pp.location
FROM prod_projects pp
WHERE pp.linked_project_id = p.id
  AND TRIM(pp.location) <> ''
  AND TRIM(COALESCE(p.location, '')) = '';

-- Repoint plant assignments to main projects
UPDATE prod_plants pl
SET assigned_project_id = pp.linked_project_id
FROM prod_projects pp
WHERE pl.assigned_project_id = pp.id
  AND pp.linked_project_id IS NOT NULL;

UPDATE prod_plants
SET assigned_project_id = NULL
WHERE assigned_project_id IS NOT NULL
  AND assigned_project_id NOT IN (SELECT id FROM projects);

-- Repoint plant–project links to main projects
UPDATE prod_plant_projects ppp
SET project_id = pp.linked_project_id
FROM prod_projects pp
WHERE ppp.project_id = pp.id
  AND pp.linked_project_id IS NOT NULL;

DELETE FROM prod_plant_projects
WHERE project_id NOT IN (SELECT id FROM projects);

ALTER TABLE prod_plants
  DROP CONSTRAINT IF EXISTS prod_plants_assigned_project_id_fkey;

ALTER TABLE prod_plants
  ADD CONSTRAINT prod_plants_assigned_project_id_fkey
  FOREIGN KEY (assigned_project_id) REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE prod_plant_projects
  DROP CONSTRAINT IF EXISTS prod_plant_projects_project_id_fkey;

ALTER TABLE prod_plant_projects
  ADD CONSTRAINT prod_plant_projects_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_prod_projects_linked_project
  ON prod_projects(linked_project_id);
