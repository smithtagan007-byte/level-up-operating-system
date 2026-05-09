-- Fix user role constraint: remove client_owner as a valid role.
-- client_owner is a responsibility assigned via clients.owner_id, not a user role.
-- Run in Supabase SQL editor.

-- Migrate any existing client_owner users to talent_specialist
update public.user_profiles
set role = 'talent_specialist'
where role = 'client_owner';

-- Replace the role check constraint
alter table public.user_profiles
  drop constraint user_profiles_role_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('director', 'talent_manager', 'talent_specialist'));

-- Also update the trigger function default to use talent_specialist
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
