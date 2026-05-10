-- Create games table to group 4 teams into a round-robin tournament
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'forming' CHECK (status IN ('forming', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add game_id to teams (each team belongs to one game)
ALTER TABLE public.teams
  ADD COLUMN game_id UUID REFERENCES public.games ON DELETE SET NULL;

-- Add game_id to matches (each match belongs to one game)
ALTER TABLE public.matches
  ADD COLUMN game_id UUID REFERENCES public.games ON DELETE SET NULL;

-- Expand teams status to include 'in_game'
ALTER TABLE public.teams DROP CONSTRAINT teams_status_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_status_check
  CHECK (status IN ('forming', 'ready', 'in_game', 'disbanded'));

-- Auto-update updated_at on games
CREATE TRIGGER set_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS for games table
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Players can see a game only if they are a member of one of its teams
CREATE POLICY "players can view their game"
  ON public.games FOR SELECT USING (
    id IN (
      SELECT t.game_id FROM public.teams t
      JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Admins can see all games
CREATE POLICY "admins can view all games"
  ON public.games FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
  );
