-- Stage Model Expansion: 5 → 9 stages
-- Run this in the Supabase SQL editor for project vfnjfjngordhvfchpjkt

-- Step 1: Drop any existing status CHECK constraint on roles table
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.roles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.roles DROP CONSTRAINT ' || quote_ident(v_constraint_name);
    RAISE NOTICE 'Dropped constraint: %', v_constraint_name;
  ELSE
    RAISE NOTICE 'No status constraint found — skipping drop.';
  END IF;
END $$;

-- Step 2: Add expanded constraint with 9 stages
ALTER TABLE public.roles
  ADD CONSTRAINT roles_status_check
  CHECK (status IN (
    'intake',
    'sourcing',
    'screening',
    'shortlisted',
    'submitted',
    'interviewing',
    'offer',
    'placed',
    'closed'
  ));

-- Done. New pipeline: intake → sourcing → screening → shortlisted → submitted → interviewing → offer → placed | closed
