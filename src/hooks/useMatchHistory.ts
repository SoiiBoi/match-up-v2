import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Match } from '@/types'

export function useMatchHistory() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['match-history', user?.id],
    queryFn: async () => {
      if (!user) return []
      // Find all teams this user was in
      const { data: myTeamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)

      if (!myTeamMemberships?.length) return []
      const myTeamIds = myTeamMemberships.map((m) => m.team_id)

      // Fetch matches where user's team was team_a or team_b
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!matches_team_a_id_fkey(
            id, status,
            members:team_members(*, profile:profiles(*))
          ),
          team_b:teams!matches_team_b_id_fkey(
            id, status,
            members:team_members(*, profile:profiles(*))
          ),
          result:match_results(*)
        `)
        .or(`team_a_id.in.(${myTeamIds.join(',')}),team_b_id.in.(${myTeamIds.join(',')})`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (matches ?? []) as Match[]
    },
    enabled: !!user,
  })
}
