-- Run in Supabase SQL editor after phase4_schema.sql

create table public.internal_reviews (
  id uuid default gen_random_uuid() primary key,
  candidate_id uuid references public.candidates(id) on delete cascade not null unique,
  role_id uuid references public.roles(id) on delete cascade not null,

  client_owner_id uuid references public.user_profiles(id) on delete set null,
  client_owner_status text not null default 'pending'
    check (client_owner_status in ('pending', 'approved', 'rework', 'rejected')),
  client_owner_notes text,

  talent_manager_id uuid references public.user_profiles(id) on delete set null,
  talent_manager_status text not null default 'pending'
    check (talent_manager_status in ('pending', 'approved', 'rework', 'rejected')),
  talent_manager_notes text,

  final_status text not null default 'pending'
    check (final_status in ('pending', 'approved_for_formatting', 'rework', 'rejected')),

  created_at timestamptz default now() not null
);

alter table public.internal_reviews enable row level security;

create policy "Authenticated users can read internal reviews"
  on public.internal_reviews for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert internal reviews"
  on public.internal_reviews for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update internal reviews"
  on public.internal_reviews for update
  using (auth.uid() is not null);
