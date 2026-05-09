-- Run this in your Supabase SQL editor after phase1 schema

-- Candidate review scorecards
create table public.candidate_reviews (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references public.candidates(id) on delete cascade not null unique,
  industry_fit smallint not null check (industry_fit between 1 and 10),
  technical_fit smallint not null check (technical_fit between 1 and 10),
  contextual_skill smallint not null check (contextual_skill between 1 and 10),
  qualification smallint not null check (qualification between 1 and 10),
  communication smallint not null check (communication between 1 and 10),
  stability smallint not null check (stability between 1 and 10),
  motivation smallint not null check (motivation between 1 and 10),
  salary_alignment smallint not null check (salary_alignment between 1 and 10),
  location_alignment smallint not null check (location_alignment between 1 and 10),
  culture_fit smallint not null check (culture_fit between 1 and 10),
  risk_score smallint not null check (risk_score between 1 and 10),
  tier text not null check (tier in ('A', 'B', 'C', 'D', 'Reject')),
  evidence_notes text not null,
  risk_notes text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.candidate_reviews enable row level security;

create policy "Authenticated users can manage reviews"
  on public.candidate_reviews for all
  using (auth.uid() is not null);

-- Candidate screening intelligence
create table public.candidate_screenings (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references public.candidates(id) on delete cascade not null unique,
  motivation text not null,
  reason_for_leaving text not null,
  growth_drivers text not null,
  pain_points text not null,
  notice_period text not null,
  competing_interviews text not null,
  counteroffer_risk text not null check (counteroffer_risk in ('Low', 'Medium', 'High')),
  career_goals text not null,
  communication_quality text not null,
  recruiter_concerns text not null,
  leverage_points text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.candidate_screenings enable row level security;

create policy "Authenticated users can manage screenings"
  on public.candidate_screenings for all
  using (auth.uid() is not null);
