-- Role Intake table — full schema
-- Safe to run on an existing table: uses CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS

CREATE TABLE IF NOT EXISTS public.role_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Core role fields
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS reports_to TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS headcount INTEGER;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS start_date DATE;

-- Location
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS work_model TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS hybrid_days_onsite INTEGER;

-- Compensation
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS salary_min NUMERIC(12,2);
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS salary_max NUMERIC(12,2);
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS bonus_notes TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS benefits_notes TEXT;

-- Requirements
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS must_have_skills TEXT[] DEFAULT '{}';
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS nice_to_have_skills TEXT[] DEFAULT '{}';
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS experience_years_min INTEGER;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS qualifications_required TEXT;

-- Ideal candidate
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS ideal_candidate_profile TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS personal_attributes TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS culture_fit_notes TEXT;

-- Interview process
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS interview_stages INTEGER;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS interview_process_notes TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS assessment_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS decision_timeline TEXT;

-- Brief context
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS role_reason TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS team_context TEXT;
ALTER TABLE public.role_intake ADD COLUMN IF NOT EXISTS red_flags TEXT;

-- RLS
ALTER TABLE public.role_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage role_intake" ON public.role_intake;
CREATE POLICY "Authenticated users can manage role_intake"
  ON public.role_intake FOR ALL USING (auth.uid() IS NOT NULL);
