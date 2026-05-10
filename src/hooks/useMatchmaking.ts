import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Position, QueueEntry, Match, TeamMember, Profile, Game } from '@/types'

export function useQueueStatus() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['queue', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .maybeSingle()
      return data as QueueEntry | null
    },
    enabled: !!user,
    refetchInterval: 3000,
  })
}

export function useJoinQueue() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ position, anyRole, partyId }: { position: Position; anyRole: boolean; partyId?: string }) => {
      if (!user) throw new Error('Not authenticated')
      await supabase.from('matchmaking_queue').delete().eq('user_id', user.id)
      const { error } = await supabase.from('matchmaking_queue').insert({
        user_id: user.id,
        preferred_position: position,
        any_role: anyRole,
        party_id: partyId ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  })
}

export function useLeaveQueue() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (partyId?: string) => {
      if (!user) throw new Error('Not authenticated')
      if (partyId) {
        const { error } = await supabase.rpc('cancel_party_queue', { party_uuid: partyId })
        if (error) throw error
      } else {
        const { error } = await supabase.from('matchmaking_queue').delete().eq('user_id', user.id)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  })
}

export function useActiveMatch() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['active-match', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (!membership) return null

      const { data: team } = await supabase
        .from('teams')
        .select('match_id')
        .eq('id', membership.team_id)
        .in('status', ['ready', 'in_match'])
        .maybeSingle()
      if (!team?.match_id) return null

      const { data: match } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!matches_team_a_id_fkey(id, status, members:team_members(*, profile:profiles(*))),
          team_b:teams!matches_team_b_id_fkey(id, status, members:team_members(*, profile:profiles(*)))
        `)
        .eq('id', team.match_id)
        .in('status', ['scheduled', 'in_progress'])
        .maybeSingle()
      return match as Match | null
    },
    enabled: !!user,
    refetchInterval: 5000,
  })
}

export interface ActiveGameData {
  phase: 'matched_waiting' | 'in_game'
  game: Game | null
  myTeam: { id: string; members: (TeamMember & { profile: Profile | null })[] }
  allMatches: (Match & { opponent: { id: string; members: (TeamMember & { profile: Profile | null })[] } })[]
}

export function useActiveGame() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['active-game', user?.id],
    queryFn: async (): Promise<ActiveGameData | null> => {
      if (!user) return null

      // Find the user's current team membership
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!membership) return null

      // Find the team — must be in 'ready' or 'in_game' status
      const { data: team } = await supabase
        .from('teams')
        .select('id, game_id, status')
        .eq('id', membership.team_id)
        .in('status', ['ready', 'in_game'])
        .maybeSingle()
      if (!team) return null

      // Fetch all members of my team with profiles
      const { data: myMembers } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)
      const memberIds = (myMembers ?? []).map((m) => m.user_id)
      const { data: profiles } = memberIds.length
        ? await supabase.from('profiles').select('*').in('id', memberIds)
        : { data: [] }
      const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
      const myTeamMembers = (myMembers ?? []).map((m) => ({ ...m, profile: profileById[m.user_id] ?? null }))

      // If no game yet → matched but waiting for more teams
      if (!team.game_id) {
        return {
          phase: 'matched_waiting',
          game: null,
          myTeam: { id: team.id, members: myTeamMembers as (TeamMember & { profile: Profile | null })[] },
          allMatches: [],
        }
      }

      // Fetch the game record
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('id', team.game_id)
        .maybeSingle()
      if (!game) return null

      // Fetch all 6 matches in this game
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('game_id', team.game_id)
        .order('scheduled_at', { ascending: true })

      // For each match, load the opponent team's members
      const allMatches = await Promise.all(
        (matches ?? []).map(async (match) => {
          const opponentTeamId = match.team_a_id === team.id ? match.team_b_id : match.team_a_id
          const { data: oppMembers } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', opponentTeamId)
          const oppIds = (oppMembers ?? []).map((m) => m.user_id)
          const { data: oppProfiles } = oppIds.length
            ? await supabase.from('profiles').select('*').in('id', oppIds)
            : { data: [] }
          const oppProfileById = Object.fromEntries((oppProfiles ?? []).map((p) => [p.id, p]))
          return {
            ...match,
            opponent: {
              id: opponentTeamId,
              members: (oppMembers ?? []).map((m) => ({ ...m, profile: oppProfileById[m.user_id] ?? null })),
            },
          }
        })
      )

      return {
        phase: 'in_game',
        game: game as Game,
        myTeam: { id: team.id, members: myTeamMembers as (TeamMember & { profile: Profile | null })[] },
        allMatches: allMatches as ActiveGameData['allMatches'],
      }
    },
    enabled: !!user,
    refetchInterval: 5000,
  })
}

export function useJoinQueueAsParty() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ partyId, members }: { partyId: string; members: { user_id: string; preferred_position: Position | null }[] }) => {
      if (!user) throw new Error('Not authenticated')
      const inserts = members.map((m) => ({
        user_id: m.user_id,
        preferred_position: m.preferred_position ?? 'CM',
        any_role: !m.preferred_position,
        party_id: partyId,
      }))
      await supabase.from('matchmaking_queue').delete().in('user_id', members.map((m) => m.user_id))
      const { error } = await supabase.from('matchmaking_queue').insert(inserts)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  })
}
