-- Add direct specialist assignment to candidates
-- Run in Supabase SQL editor

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_assigned_to ON candidates(assigned_to);
