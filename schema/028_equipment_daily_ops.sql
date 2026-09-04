-- Daily Operations Log (fleet Phase 2)

CREATE TABLE IF NOT EXISTS equipment_daily_ops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  ops_date DATE NOT NULL,
  operable_hr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  idle_hr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  down_hr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reason_down TEXT NOT NULL DEFAULT '',
  reason_idle TEXT NOT NULL DEFAULT '',
  fuel_norm NUMERIC(12, 3),
  actual_fuel NUMERIC(12, 3),
  lease_rate_hour NUMERIC(14, 2),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (equipment_id, ops_date)
);

CREATE INDEX IF NOT EXISTS idx_equipment_daily_ops_project_date
  ON equipment_daily_ops(project_id, ops_date DESC);

CREATE INDEX IF NOT EXISTS idx_equipment_daily_ops_equipment
  ON equipment_daily_ops(equipment_id, ops_date DESC);
