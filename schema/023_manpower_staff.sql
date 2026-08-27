-- Manpower / Central Garage staff directory (source of truth for ID ↔ name)

CREATE TABLE IF NOT EXISTS manpower_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manpower_staff_active ON manpower_staff (is_active);
CREATE INDEX IF NOT EXISTS idx_manpower_staff_name ON manpower_staff (LOWER(full_name));
CREATE INDEX IF NOT EXISTS idx_manpower_staff_employee_id ON manpower_staff (employee_id);
