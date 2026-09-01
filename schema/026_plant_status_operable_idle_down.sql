-- Plant status: Operable, Idle, Down (+ down reason)

ALTER TABLE prod_plants
  ADD COLUMN IF NOT EXISTS status_reason TEXT NOT NULL DEFAULT '';

DO $$ BEGIN
  CREATE TYPE prod_plant_status_v2 AS ENUM ('operable', 'idle', 'down');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE prod_plants
  ADD COLUMN IF NOT EXISTS status_new prod_plant_status_v2;

UPDATE prod_plants SET status_new = CASE status::text
  WHEN 'running' THEN 'operable'::prod_plant_status_v2
  WHEN 'idle' THEN 'idle'::prod_plant_status_v2
  WHEN 'maintenance' THEN 'down'::prod_plant_status_v2
  WHEN 'out_of_service' THEN 'down'::prod_plant_status_v2
  ELSE 'idle'::prod_plant_status_v2
END
WHERE status_new IS NULL;

UPDATE prod_plants
SET status_reason = CASE
  WHEN status::text = 'maintenance' THEN 'under_repair'
  WHEN status::text = 'out_of_service' THEN 'under_dismantling'
  ELSE status_reason
END
WHERE status_new = 'down'::prod_plant_status_v2
  AND TRIM(status_reason) = '';

ALTER TABLE prod_plants ALTER COLUMN status_new SET DEFAULT 'operable'::prod_plant_status_v2;
ALTER TABLE prod_plants ALTER COLUMN status_new SET NOT NULL;

ALTER TABLE prod_plants DROP COLUMN status;
ALTER TABLE prod_plants RENAME COLUMN status_new TO status;

DROP TYPE IF EXISTS prod_plant_status;
ALTER TYPE prod_plant_status_v2 RENAME TO prod_plant_status;

CREATE INDEX IF NOT EXISTS idx_prod_plants_status_reason
  ON prod_plants(status_reason)
  WHERE status = 'down';
