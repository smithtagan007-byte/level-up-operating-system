-- Role Team Schema
-- One role → many team members, each with a typed role_on_role.
-- Replaces the single delivery_recruiter_id field as primary source of truth.
-- NOTE: unique constraint is (role_id, user_id, role_on_role) — not (role_id, user_id)
--       so one person can hold both client_owner and delivery_specialist on the same role.

create table if not exists public.role_team (
  id              uuid primary key default gen_random_uuid(),
  role_id         uuid not null references public.roles(id) on delete cascade,
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  role_on_role    text not null check (role_on_role in ('client_owner', 'delivery_specialist')),
  assigned_by     uuid references public.user_profiles(id),
  assigned_date   date default current_date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (role_id, user_id, role_on_role)
);

-- updated_at trigger
create or replace function public.handle_role_team_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists role_team_updated_at on public.role_team;
create trigger role_team_updated_at
  before update on public.role_team
  for each row execute function public.handle_role_team_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.role_team enable row level security;

-- All authenticated users can read
create policy "role_team_read_all" on public.role_team
  for select
  using (auth.uid() is not null);

-- Talent Manager and Director can insert
create policy "role_team_insert_managers" on public.role_team
  for insert
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

-- Talent Manager and Director can update (for is_active = false removals)
create policy "role_team_update_managers" on public.role_team
  for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

-- Talent Manager and Director can delete
create policy "role_team_delete_managers" on public.role_team
  for delete
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('talent_manager', 'director')
    )
  );

-- ── Migration from existing data ──────────────────────────────────────────────

-- Migrate delivery_recruiter_id from role_tracker → role_team
insert into public.role_team (role_id, user_id, role_on_role, assigned_date)
select rt.role_id, rt.delivery_recruiter_id, 'delivery_specialist', r.created_at::date
from public.role_tracker rt
join public.roles r on r.id = rt.role_id
where rt.delivery_recruiter_id is not null
on conflict (role_id, user_id, role_on_role) do nothing;

-- Migrate client_owner from clients.owner_id → role_team
insert into public.role_team (role_id, user_id, role_on_role, assigned_date)
select r.id, c.owner_id, 'client_owner', r.created_at::date
from public.roles r
join public.clients c on c.id = r.client_id
where c.owner_id is not null
on conflict (role_id, user_id, role_on_role) do nothing;
