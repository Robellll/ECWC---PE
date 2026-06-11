DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin', 'ceo', 'pe_manager', 'pe_admin',
    'project_pe_admin', 'pe_maintenance', 'project_pe_maintenance', 'insurance_officer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE equipment_status AS ENUM ('operational', 'under_maintenance', 'idle', 'breakdown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE equipment_type AS ENUM (
    'excavator', 'dozer', 'dump_truck', 'loader', 'grader', 'roller',
    'crane', 'generator', 'concrete_mixer', 'plant', 'vehicle', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE garage_stage AS ENUM ('received', 'diagnosing', 'in_repair', 'testing', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE garage_status AS ENUM ('in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE insurance_stage AS ENUM (
    'reported', 'documents_pending', 'inspection', 'approved', 'payout_received', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE insurance_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contact_role AS ENUM ('admin', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
