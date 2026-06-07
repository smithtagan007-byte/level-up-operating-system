-- Add pipeline_stage to candidates table for kanban positioning
-- Run once in Supabase SQL editor

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'unprocessed';

-- Optional: index for fast filtering by stage within a role
CREATE INDEX IF NOT EXISTS idx_candidates_pipeline_stage ON public.candidates (pipeline_stage);
