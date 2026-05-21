-- Role Team Fix: security-definer RPCs + ensure unique index
-- Run in Supabase SQL editor (project vfnjfjngordhvfchpjkt)
-- This replaces the direct table upsert/update that can be blocked by RLS.

-- Step 1: Ensure unique index exists (safe if already present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_team_unique_assignment
ON public.role_team (role_id, user_id, role_on_role);

-- Step 2: assign_team_member — security definer, bypasses RLS
CREATE OR REPLACE FUNCTION public.assign_team_member(
  p_role_id      UUID,
  p_user_id      UUID,
  p_role_on_role TEXT,
  p_assigned_by  UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Verify caller is a manager or director
  SELECT role INTO v_caller_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_caller_role NOT IN ('talent_manager', 'director') THEN
    RAISE EXCEPTION 'Not authorised: only Talent Managers and Directors can manage role teams.';
  END IF;

  -- If assigning a new client_owner, deactivate any existing one first
  IF p_role_on_role = 'client_owner' THEN
    UPDATE role_team
    SET is_active = false
    WHERE role_id = p_role_id
      AND role_on_role = 'client_owner'
      AND is_active = true
      AND user_id != p_user_id;
  END IF;

  -- Upsert the assignment
  INSERT INTO role_team (role_id, user_id, role_on_role, assigned_by, assigned_date, is_active)
  VALUES (p_role_id, p_user_id, p_role_on_role, p_assigned_by, CURRENT_DATE, true)
  ON CONFLICT (role_id, user_id, role_on_role)
  DO UPDATE SET
    is_active     = true,
    assigned_by   = EXCLUDED.assigned_by,
    assigned_date = EXCLUDED.assigned_date,
    updated_at    = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_team_member(UUID, UUID, TEXT, UUID) TO authenticated;

-- Step 3: remove_team_member — security definer, bypasses RLS
CREATE OR REPLACE FUNCTION public.remove_team_member(
  p_role_id      UUID,
  p_user_id      UUID,
  p_role_on_role TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_caller_role NOT IN ('talent_manager', 'director') THEN
    RAISE EXCEPTION 'Not authorised: only Talent Managers and Directors can manage role teams.';
  END IF;

  UPDATE role_team
  SET is_active = false
  WHERE role_id = p_role_id
    AND user_id = p_user_id
    AND role_on_role = p_role_on_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_team_member(UUID, UUID, TEXT) TO authenticated;
