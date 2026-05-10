-- Expand team_members.assigned_position to include all 10 positions (CB, LM, RM were missing)
ALTER TABLE public.team_members DROP CONSTRAINT team_members_assigned_position_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_assigned_position_check
  CHECK (assigned_position IN ('GK','LB','CB','RB','LM','CM','RM','LW','RW','ST'));
