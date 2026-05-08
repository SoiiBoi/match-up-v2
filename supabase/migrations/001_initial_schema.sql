-- =============================================
-- Match Up v2 — Initial Database Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- ── PROFILES ──────────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  age INTEGER,
  nationality TEXT,
  height_cm INTEGER,
  weight_kg INTEGER,
  preferred_position TEXT CHECK (preferred_position IN ('GK','ST','LW','RW','CM','LB','RB')),
  games_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, age, preferred_position)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    (NEW.raw_user_meta_data->>'age')::INTEGER,
    NEW.raw_user_meta_data->>'preferred_position'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── USER ROLES ─────────────────────────────────
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ── FRIENDSHIPS ────────────────────────────────
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can create friendships" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ── FRIEND REQUESTS ────────────────────────────
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users ON DELETE CASCADE,
  requested_id UUID REFERENCES auth.users ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, requested_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own requests" ON public.friend_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = requested_id);
CREATE POLICY "Users can send requests" ON public.friend_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update requests they received" ON public.friend_requests FOR UPDATE TO authenticated
  USING (auth.uid() = requested_id);
CREATE POLICY "Users can delete own requests" ON public.friend_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- ── PARTIES ────────────────────────────────────
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID REFERENCES auth.users ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_queue', 'disbanded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_party_member(party_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.party_members WHERE party_id = party_uuid AND user_id = user_uuid);
$$;

CREATE POLICY "Party members can view party" ON public.parties FOR SELECT TO authenticated
  USING (leader_id = auth.uid() OR public.is_party_member(id, auth.uid()));
CREATE POLICY "Users can create parties" ON public.parties FOR INSERT TO authenticated
  WITH CHECK (leader_id = auth.uid());
CREATE POLICY "Leaders can update party" ON public.parties FOR UPDATE TO authenticated
  USING (leader_id = auth.uid());
CREATE POLICY "Leaders can delete party" ON public.parties FOR DELETE TO authenticated
  USING (leader_id = auth.uid());

-- ── PARTY MEMBERS ──────────────────────────────
CREATE TABLE public.party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  preferred_position TEXT CHECK (preferred_position IN ('GK','ST','LW','RW','CM','LB','RB')),
  status TEXT DEFAULT 'not_ready' CHECK (status IN ('ready', 'not_ready')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, user_id)
);

ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Party members can view members" ON public.party_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_party_member(party_id, auth.uid()));
CREATE POLICY "Users can join party" ON public.party_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own membership" ON public.party_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can leave party" ON public.party_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── PARTY INVITATIONS ──────────────────────────
CREATE TABLE public.party_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties ON DELETE CASCADE,
  inviter_id UUID REFERENCES auth.users ON DELETE CASCADE,
  invitee_id UUID REFERENCES auth.users ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.party_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their invitations" ON public.party_invitations FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
CREATE POLICY "Users can send invitations" ON public.party_invitations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Invitees can update invitation" ON public.party_invitations FOR UPDATE TO authenticated
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);
CREATE POLICY "Users can delete invitations" ON public.party_invitations FOR DELETE TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- ── MATCHMAKING QUEUE ──────────────────────────
CREATE TABLE public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  preferred_position TEXT NOT NULL CHECK (preferred_position IN ('GK','ST','LW','RW','CM','LB','RB')),
  any_role BOOLEAN DEFAULT false,
  skill_level INTEGER DEFAULT 1000,
  party_id UUID REFERENCES public.parties ON DELETE SET NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own queue entry" ON public.matchmaking_queue FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all queue entries" ON public.matchmaking_queue FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ── TEAMS ──────────────────────────────────────
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'forming' CHECK (status IN ('forming', 'ready', 'in_match', 'disbanded')),
  match_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view their team" ON public.teams FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ── TEAM MEMBERS ───────────────────────────────
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  assigned_position TEXT NOT NULL CHECK (assigned_position IN ('GK','ST','LW','RW','CM','LB','RB')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id),
  UNIQUE(team_id, assigned_position)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view team roster" ON public.team_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm2 WHERE tm2.team_id = team_id AND tm2.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ── MATCHES ────────────────────────────────────
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_id UUID REFERENCES public.teams ON DELETE SET NULL,
  team_b_id UUID REFERENCES public.teams ON DELETE SET NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  venue TEXT DEFAULT 'Football Arena Bangkok',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants can view match" ON public.matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE (team_id = team_a_id OR team_id = team_b_id) AND user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ── MATCH RESULTS ──────────────────────────────
CREATE TABLE public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches ON DELETE CASCADE UNIQUE,
  team_a_score INTEGER DEFAULT 0,
  team_b_score INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users
);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants can view results" ON public.match_results FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.team_members tm ON tm.team_id = m.team_a_id OR tm.team_id = m.team_b_id
      WHERE m.id = match_id AND tm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can record results" ON public.match_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update results" ON public.match_results FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ── AUTO-UPDATE TIMESTAMPS ─────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_parties_updated_at BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_party_invitations_updated_at BEFORE UPDATE ON public.party_invitations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_matchmaking_queue_updated_at BEFORE UPDATE ON public.matchmaking_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
