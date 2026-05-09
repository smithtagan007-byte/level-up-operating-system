-- Enable RLS
-- Run this in your Supabase SQL editor

-- User profiles (extends Supabase auth.users)
create table public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('director', 'talent_manager', 'client_owner', 'talent_specialist')),
  created_at timestamptz default now() not null
);

alter table public.user_profiles enable row level security;

-- Users can read all profiles; only directors/talent managers can write
create policy "Users can read all profiles"
  on public.user_profiles for select
  using (auth.uid() is not null);

create policy "Directors and talent managers can manage profiles"
  on public.user_profiles for all
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('director', 'talent_manager')
    )
  );

-- Clients
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  industry text,
  grade text check (grade in ('A', 'B', 'C', 'D')),
  owner_id uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.clients enable row level security;

create policy "Authenticated users can read clients"
  on public.clients for select
  using (auth.uid() is not null);

create policy "Client owners and above can manage clients"
  on public.clients for all
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('director', 'talent_manager', 'client_owner')
    )
  );

-- Roles (job roles/vacancies)
create table public.roles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  status text not null default 'intake' check (status in ('intake', 'sourcing', 'screening', 'interviewing', 'closed')),
  intake_completed boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.roles enable row level security;

create policy "Authenticated users can read roles"
  on public.roles for select
  using (auth.uid() is not null);

create policy "Authenticated users can manage roles"
  on public.roles for all
  using (auth.uid() is not null);

-- Candidates
create table public.candidates (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text,
  role_id uuid references public.roles(id) on delete cascade not null,
  tier text check (tier in ('A', 'B', 'C', 'D', 'Reject')),
  risk_level text check (risk_level in ('Low', 'Medium', 'High', 'Critical')),
  client_owner_approved boolean default false not null,
  talent_manager_approved boolean default false not null,
  submitted_to_client boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.candidates enable row level security;

create policy "Authenticated users can read candidates"
  on public.candidates for select
  using (auth.uid() is not null);

create policy "Authenticated users can manage candidates"
  on public.candidates for all
  using (auth.uid() is not null);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'talent_specialist')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
