-- Weekly Self-Review schema — run after tracker_schema.sql

create table public.weekly_self_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  week_start date not null,

  -- Scorecard (1–10 each)
  client_communication_score    int check (client_communication_score between 1 and 10),
  candidate_communication_score int check (candidate_communication_score between 1 and 10),
  pipeline_control_score        int check (pipeline_control_score between 1 and 10),
  quality_of_work_score         int check (quality_of_work_score between 1 and 10),
  follow_up_discipline_score    int check (follow_up_discipline_score between 1 and 10),

  -- Auto-calculated average (null when any score is null)
  overall_score numeric(4,2) generated always as (
    case
      when client_communication_score    is not null
       and candidate_communication_score is not null
       and pipeline_control_score        is not null
       and quality_of_work_score         is not null
       and follow_up_discipline_score    is not null
      then round(
        (client_communication_score + candidate_communication_score + pipeline_control_score + quality_of_work_score + follow_up_discipline_score)::numeric / 5,
        2
      )
      else null
    end
  ) stored,

  -- Reflection
  what_went_well              text,
  what_did_not_go_well        text,
  hot_roles                   text,
  pending_feedback_or_blockers text,
  next_week_priorities        text,

  -- Manager section
  manager_comments text,
  reviewed         boolean default false not null,
  reviewed_at      timestamptz,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique (user_id, week_start)
);

alter table public.weekly_self_reviews enable row level security;

-- Recruiters: read/write their own rows only
create policy "Users can read own self reviews"
  on public.weekly_self_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert own self reviews"
  on public.weekly_self_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own self reviews"
  on public.weekly_self_reviews for update
  using (auth.uid() = user_id);

-- Talent Managers and Directors: read all rows
create policy "Managers can read all self reviews"
  on public.weekly_self_reviews for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
      and role in ('talent_manager', 'director')
    )
  );

-- Talent Managers can update manager_comments, reviewed, reviewed_at on any row
-- (column-level enforcement is handled in the server action)
create policy "Managers can update self reviews"
  on public.weekly_self_reviews for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
      and role in ('talent_manager', 'director')
    )
  );
