-- Production Management module

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'production_officer';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prod_plant_type AS ENUM (
    'aggregate', 'crusher', 'ready_mix', 'asphalt', 'sand', 'base_course'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prod_plant_status AS ENUM (
    'running', 'idle', 'maintenance', 'out_of_service'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prod_material_category AS ENUM (
    'aggregate', 'sand', 'base_course', 'ready_mix_concrete', 'asphalt'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prod_project_status AS ENUM (
    'active', 'on_hold', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prod_demand_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prod_demand_status AS ENUM (
    'pending', 'in_production', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prod_shift AS ENUM ('day', 'night', 'full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prod_stock_tx_type AS ENUM ('opening', 'production', 'dispatch');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS prod_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category prod_material_category NOT NULL,
  unit TEXT NOT NULL DEFAULT 'm³',
  description TEXT NOT NULL DEFAULT '',
  min_stock_level NUMERIC(14, 3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prod_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  client TEXT NOT NULL DEFAULT '',
  status prod_project_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prod_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  plant_type prod_plant_type NOT NULL,
  capacity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'm³',
  location TEXT NOT NULL DEFAULT '',
  assigned_project_id UUID REFERENCES prod_projects(id) ON DELETE SET NULL,
  status prod_plant_status NOT NULL DEFAULT 'idle',
  commission_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prod_plant_projects (
  plant_id UUID NOT NULL REFERENCES prod_plants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES prod_projects(id) ON DELETE CASCADE,
  PRIMARY KEY (plant_id, project_id)
);

CREATE TABLE IF NOT EXISTS prod_demand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES prod_projects(id) ON DELETE RESTRICT,
  material_id UUID NOT NULL REFERENCES prod_materials(id) ON DELETE RESTRICT,
  requested_quantity NUMERIC(14, 3) NOT NULL,
  unit TEXT NOT NULL,
  required_date DATE NOT NULL,
  priority prod_demand_priority NOT NULL DEFAULT 'medium',
  status prod_demand_status NOT NULL DEFAULT 'pending',
  produced_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  remarks TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prod_daily_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date DATE NOT NULL,
  plant_id UUID NOT NULL REFERENCES prod_plants(id) ON DELETE RESTRICT,
  material_id UUID NOT NULL REFERENCES prod_materials(id) ON DELETE RESTRICT,
  quantity_produced NUMERIC(14, 3) NOT NULL,
  unit TEXT NOT NULL,
  shift prod_shift NOT NULL DEFAULT 'day',
  operator_name TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prod_dispatch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_date DATE NOT NULL,
  project_id UUID NOT NULL REFERENCES prod_projects(id) ON DELETE RESTRICT,
  material_id UUID NOT NULL REFERENCES prod_materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL,
  unit TEXT NOT NULL,
  vehicle TEXT NOT NULL DEFAULT '',
  driver_name TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  delivery_note_number TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prod_stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES prod_materials(id) ON DELETE RESTRICT,
  transaction_type prod_stock_tx_type NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  reference_id UUID,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prod_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prod_plants_status ON prod_plants(status);
CREATE INDEX IF NOT EXISTS idx_prod_plants_project ON prod_plants(assigned_project_id);
CREATE INDEX IF NOT EXISTS idx_prod_demand_status ON prod_demand(status);
CREATE INDEX IF NOT EXISTS idx_prod_demand_required ON prod_demand(required_date);
CREATE INDEX IF NOT EXISTS idx_prod_daily_prod_date ON prod_daily_production(production_date);
CREATE INDEX IF NOT EXISTS idx_prod_dispatch_date ON prod_dispatch(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_prod_stock_tx_material ON prod_stock_transactions(material_id, created_at);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS prod_entity_type TEXT;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS prod_entity_id UUID;
