-- HR Coordinator: HR module only (sidebar and routes limited to /hr)
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'hr_coordinator';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
