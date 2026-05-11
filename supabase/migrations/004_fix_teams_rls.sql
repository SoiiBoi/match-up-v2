-- The teams RLS policy uses EXISTS on team_members, which itself has a self-join RLS policy.
-- This recursive evaluation causes PostgreSQL to return no rows for non-admin users.
-- Fix: SECURITY DEFINER function reads team_members without going through RLS.

CREATE OR REPLACE FUNCTION public.user_is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Team members can view their team" ON public.teams;
CREATE POLICY "Team members can view their team" ON public.teams FOR SELECT TO authenticated
  USING (
    public.user_is_team_member(id)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
