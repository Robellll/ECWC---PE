-- Reason required when equipment is idle or down

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS status_reason TEXT DEFAULT '';
