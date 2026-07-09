-- Extended equipment registration fields (asset register)

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS plate_serial TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS operator_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS operator_phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo TEXT DEFAULT '';
