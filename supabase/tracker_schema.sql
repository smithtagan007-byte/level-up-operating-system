-- Performance Tracker schema — run after phase5_schema.sql

-- Role-level tracking overlay (one record per role, auto-created)
create table public.role_tracker (
  id uuid default gen_random_uuid() primary key,
  role_id uuid references public.roles(id) on delete cascade not null unique,
  client_id uuid references public.clients(id) on delete set null,
  role_title text not null,
  level text,
  location text,
  role_originator_id uuid references public.user_profiles(id) on delete set null,
  role_status text,
  role_stage text,
  delivery_recruiter_id uuid references public.user_profiles(id) on delete set null,
  date_opened date,
  date_closed date,
  -- days_open is computed on display: today - date_opened (or date_closed - date_opened)
  days_open integer,
  cvs_submitted integer default 0 not null,
  cvs_declined integer default 0 not null,
  cv_pending integer default 0 not null,
  placements integer default 0 not null,
  expected_revenue numeric(10,2),
  actual_revenue numeric(10,2),
  revenue_probability integer check (revenue_probability between 0 and 100),
  sourced_location text,
  next_action text,
  next_action_date date,
  follow_up_owner_id uuid references public.user_profiles(id) on delete set null,
  follow_up_status text default 'none' check (follow_up_status in ('none', 'pending', 'overdue')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.role_tracker enable row level security;
create policy "Authenticated users can manage role_tracker"
  on public.role_tracker for all using (auth.uid() is not null);

-- Weekly sales activity (BD calls, new clients, signed terms)
create table public.sales_tracker (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  week_start date not null,
  fy_year integer,
  fy_week integer,
  week_number integer,
  month integer,
  year integer,
  new_clients integer default 0 not null,
  signed_terms integer default 0 not null,
  new_roles integer default 0 not null,
  calls_made integer default 0 not null,
  follow_ups integer default 0 not null,
  total_calls integer generated always as (calls_made + follow_ups) stored,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, week_start)
);

alter table public.sales_tracker enable row level security;
create policy "Users can manage their own sales_tracker"
  on public.sales_tracker for all using (auth.uid() is not null);

-- Weekly delivery KPIs (interviews, offers, revenue)
create table public.weekly_role_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  week_start date not null,
  fy_year integer,
  fy_week integer,
  week_number integer,
  month integer,
  year integer,
  interviews_assessments integer default 0 not null,
  planned_roles integer default 0 not null,
  cvs integer default 0 not null,
  cvs_declined integer default 0 not null,
  zero_submissions integer default 0 not null,
  first_interviews integer default 0 not null,
  second_interviews integer default 0 not null,
  assessments integer default 0 not null,
  declines integer default 0 not null,
  offers integer default 0 not null,
  offers_declined integer default 0 not null,
  starts integer default 0 not null,
  revenue numeric(10,2) default 0 not null,
  cost numeric(10,2) default 0 not null,
  net_revenue numeric(10,2) generated always as (revenue - cost) stored,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, week_start)
);

alter table public.weekly_role_data enable row level security;
create policy "Authenticated users can read weekly_role_data"
  on public.weekly_role_data for select using (auth.uid() is not null);
create policy "Users can manage their own weekly_role_data"
  on public.weekly_role_data for insert with check (auth.uid() = user_id);
create policy "Users can update their own weekly_role_data"
  on public.weekly_role_data for update using (auth.uid() = user_id);

-- Follow-up tracker (linked to clients, candidates, or roles)
create table public.follow_ups (
  id uuid default gen_random_uuid() primary key,
  related_type text not null check (related_type in ('client', 'candidate', 'role')),
  related_id uuid not null,
  client_id uuid references public.clients(id) on delete set null,
  candidate_id uuid references public.candidates(id) on delete set null,
  role_id uuid references public.roles(id) on delete set null,
  owner_id uuid references public.user_profiles(id) on delete set null not null,
  follow_up_type text not null,
  follow_up_reason text,
  due_date date not null,
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.follow_ups enable row level security;
create policy "Authenticated users can manage follow_ups"
  on public.follow_ups for all using (auth.uid() is not null);
