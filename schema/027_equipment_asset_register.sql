-- Equipment Asset Register fields (fleet Phase 1)

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS equipment_type_label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS make TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manufacturing_year INT,
  ADD COLUMN IF NOT EXISTS fuel_norm NUMERIC(12, 3),
  ADD COLUMN IF NOT EXISTS lease_rate_hour NUMERIC(14, 2);

CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_type_label ON equipment(equipment_type_label);
