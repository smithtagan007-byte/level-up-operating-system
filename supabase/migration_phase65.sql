-- Phase 6.5 — Workflow Intelligence & Operational Pressure Engine
-- Run in Supabase SQL editor

-- ─── 1. Role stage aging ──────────────────────────────────────────────────────
ALTER TABLE roles ADD COLUMN IF NOT EXISTS entered_stage_at TIMESTAMPTZ DEFAULT NOW();

-- ─── 2. Versioned candidate submissions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  submission_note TEXT,
  client_feedback TEXT,
  feedback_status TEXT NOT NULL DEFAULT 'submitted' CHECK (feedback_status IN (
    'submitted', 'viewed', 'shortlisted', 'interview_requested', 'rejected', 'on_hold', 'withdrawn'
  )),
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, candidate_id, version)
);

ALTER TABLE candidate_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage candidate_submissions"
  ON candidate_submissions FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_candidate_submissions_candidate ON candidate_submissions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_submissions_role ON candidate_submissions(role_id);
CREATE INDEX IF NOT EXISTS idx_candidate_submissions_latest ON candidate_submissions(candidate_id, is_latest) WHERE is_latest = true;

-- ─── 3. Interview tracking ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidate_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_submission_id UUID NOT NULL REFERENCES candidate_submissions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  interview_stage TEXT NOT NULL DEFAULT '1st' CHECK (interview_stage IN ('1st', '2nd', '3rd', 'final', 'assessment')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'completed', 'cancelled', 'rescheduled', 'feedback_pending', 'passed', 'rejected'
  )),
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'pass', 'reject', 'no_show', 'withdrawn')),
  feedback TEXT,
  interviewer_name TEXT,
  client_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE candidate_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage candidate_interviews"
  ON candidate_interviews FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_candidate_interviews_candidate ON candidate_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interviews_submission ON candidate_interviews(candidate_submission_id);

-- ─── 4. Offer tracking ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_submission_id UUID NOT NULL REFERENCES candidate_submissions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  offered_salary NUMERIC(12,2),
  start_date DATE,
  notice_period_days INTEGER,
  counter_offered BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,
  replacement_risk TEXT CHECK (replacement_risk IN ('low', 'medium', 'high')),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage offers"
  ON offers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_offers_candidate ON offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_role ON offers(role_id);

-- ─── 5. Activity events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('role', 'candidate', 'submission', 'interview', 'offer')),
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage activity_events"
  ON activity_events FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON activity_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_occurred ON activity_events(occurred_at DESC);

-- ─── 6. Action items (system-generated only) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  related_entity_type TEXT,
  related_entity_id UUID,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage action_items"
  ON action_items FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_action_items_owner ON action_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_action_items_open ON action_items(owner_id) WHERE resolved_at IS NULL AND dismissed_at IS NULL;
