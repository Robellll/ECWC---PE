CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_unassigned BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role contact_role NOT NULL DEFAULT 'admin',
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  avatar TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type equipment_type NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  capacity TEXT,
  status equipment_status NOT NULL DEFAULT 'operational',
  manager_notes TEXT DEFAULT '',
  added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS garage_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  sro_number TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL,
  reported_issue TEXT DEFAULT '',
  manager_notes TEXT DEFAULT '',
  workshop garage_workshop,
  receiving_inspector TEXT NOT NULL DEFAULT '',
  assigned_technician TEXT NOT NULL DEFAULT '',
  final_inspection_officer TEXT NOT NULL DEFAULT '',
  priority priority_level NOT NULL DEFAULT 'normal',
  stage garage_stage NOT NULL DEFAULT 'received',
  status garage_status NOT NULL DEFAULT 'in_progress',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS garage_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES garage_vehicles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  model TEXT NOT NULL,
  accident_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accident_description TEXT DEFAULT '',
  claim_number TEXT NOT NULL UNIQUE,
  insurance_provider TEXT DEFAULT '',
  estimated_cost TEXT DEFAULT '',
  priority priority_level NOT NULL DEFAULT 'normal',
  stage insurance_stage NOT NULL DEFAULT 'reported',
  status insurance_status NOT NULL DEFAULT 'open',
  claim_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
