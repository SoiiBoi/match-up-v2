-- Fix: all players in a game can see all 6 matches (not just their team's 3)
-- This ensures team color assignment works correctly for every user

DROP POLICY IF EXISTS "Match participants can view match" ON public.matches;

CREATE POLICY "Players can view all matches in their game" ON public.matches
  FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT t.game_id FROM public.teams t
      JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid() AND t.game_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
