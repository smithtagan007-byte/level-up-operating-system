-- Commission & Invoicing Module
-- Creates: placements, commission_summary
-- RLS: director (all), talent_manager (read only), talent_specialist (none)

create extension if not exists "pgcrypto";

-- ── placements ────────────────────────────────────────────────────────────────

create table if not exists public.placements (
  id                       uuid primary key default gen_random_uuid(),
  staff_name               text,
  recruiter_id             uuid references public.user_profiles(id) on delete set null,
  client_invoice_date      date,
  client                   text not null,
  candidate_name           text not null,
  role_name                text not null,
  start_date               date,
  annual_ctc               numeric,
  placement_fee_percentage numeric,
  placement_fee            numeric,
  invoice_number           text,
  client_paid              boolean default false,
  commission_percentage    numeric,
  commission_earned        numeric,
  commission_month         text,
  payroll_month            text,
  commission_paid          numeric default 0,
  ts_earned                numeric default 0,
  payroll_commission       numeric default 0,
  payroll_advance          numeric default 0,
  advance_paid             numeric default 0,
  notes                    text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ── commission_summary ────────────────────────────────────────────────────────

create table if not exists public.commission_summary (
  id                           uuid primary key default gen_random_uuid(),
  recruiter_id                 uuid references public.user_profiles(id),
  month                        text not null,
  year                         int not null,
  total_placements             int default 0,
  total_placement_fees         numeric default 0,
  total_commission_earned      numeric default 0,
  total_commission_paid        numeric default 0,
  total_commission_outstanding numeric default 0,
  total_advances               numeric default 0,
  created_at                   timestamptz default now(),
  updated_at                   timestamptz default now()
);

-- ── updated_at trigger ────────────────────────────────────────────────────────

create or replace function public.handle_commission_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists placements_updated_at on public.placements;
create trigger placements_updated_at
  before update on public.placements
  for each row execute function public.handle_commission_updated_at();

drop trigger if exists commission_summary_updated_at on public.commission_summary;
create trigger commission_summary_updated_at
  before update on public.commission_summary
  for each row execute function public.handle_commission_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.placements enable row level security;
alter table public.commission_summary enable row level security;

-- placements: director full access
create policy "placements_director_all" on public.placements
  for all
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'director')
  )
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'director')
  );

-- placements: talent_manager read only
create policy "placements_manager_read" on public.placements
  for select
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'talent_manager')
  );

-- commission_summary: director full access
create policy "commission_summary_director_all" on public.commission_summary
  for all
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'director')
  )
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'director')
  );

-- commission_summary: talent_manager read only
create policy "commission_summary_manager_read" on public.commission_summary
  for select
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'talent_manager')
  );
