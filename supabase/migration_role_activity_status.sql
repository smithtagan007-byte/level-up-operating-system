-- Add activity_status to roles table
-- Tracks operational state: active (being worked), parked (on hold), placed (filled), closed (cancelled)
-- Separate from `status` which tracks the pipeline stage (intake → sourcing → ... → probation_completed)

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS activity_status TEXT DEFAULT 'active';

ALTER TABLE public.roles ADD CONSTRAINT roles_activity_status_check CHECK (
  activity_status IN ('active', 'parked', 'placed', 'closed')
);
