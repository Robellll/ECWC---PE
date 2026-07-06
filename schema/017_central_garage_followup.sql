-- Central garage follow-up mechanics (view-only, sidebar limited to Central Garage)
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'central_garage_followup';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
