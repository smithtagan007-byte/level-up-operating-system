-- Unify role pipeline stages to match candidate pipeline stages
-- Run in Supabase SQL editor
-- IMPORTANT: Drop constraint FIRST, then rename, then recreate.

-- 1. Drop existing constraint so renames can proceed
ALTER TABLE public.roles
DROP CONSTRAINT IF EXISTS roles_status_check;

-- 2. Rename old stage values to new unified names
UPDATE public.roles SET status = 'in_review'           WHERE status = 'shortlisted';
UPDATE public.roles SET status = 'interview'            WHERE status = 'interviewing';
UPDATE public.roles SET status = 'started'              WHERE status = 'placed';
UPDATE public.roles SET status = 'probation_completed'  WHERE status = 'probation_passed';

-- 3. Add new constraint with unified stage names
ALTER TABLE public.roles
ADD CONSTRAINT roles_status_check CHECK (
  status IN (
    'intake', 'sourcing', 'screening', 'in_review',
    'approved', 'submitted', 'interview', 'offer',
    'started', 'probation_completed', 'closed'
  )
);
