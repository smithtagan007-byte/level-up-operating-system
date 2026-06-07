-- Adds probation_passed as a valid role status
-- Safe to run even if the column has no CHECK constraint

-- If your roles.status column has a CHECK constraint, drop and recreate it:
ALTER TABLE public.roles
DROP CONSTRAINT IF EXISTS roles_status_check;

ALTER TABLE public.roles
ADD CONSTRAINT roles_status_check CHECK (
  status IN (
    'intake', 'sourcing', 'screening', 'shortlisted',
    'submitted', 'interviewing', 'offer',
    'placed', 'probation_passed', 'closed'
  )
);
