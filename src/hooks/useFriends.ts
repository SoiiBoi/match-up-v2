import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Friendship, FriendRequest, PartyInvitation, Profile, Position } from '@/types'

const ALL_POSITIONS: Position[] = ['GK', 'ST', 'LW', 'RW', 'CM', 'LB', 'RB']

export function useFriendsList() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', user.id)
      if (error) throw error
      if (!data?.length) return []
      const ids = data.map((f) => f.friend_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
      return data.map((f) => ({ ...f, profile: byId[f.friend_id] ?? null })) as Friendship[]
    },
    enabled: !!user,
  })
}

export function useFriendRequests() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('requested_id', user.id)
        .eq('status', 'pending')
      if (error) throw error
      if (!data?.length) return []
      const ids = data.map((r) => r.requester_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
      return data.map((r) => ({ ...r, requester_profile: byId[r.requester_id] ?? null })) as FriendRequest[]
    },
    enabled: !!user,
    refetchInterval: 5000,
  })
}

export function usePartyInvitations() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['party-invitations', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('party_invitations')
        .select('*, party:parties(*)')
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
      if (error) throw error
      if (!data?.length) return []
      const ids = data.map((r) => r.inviter_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
      return data.map((r) => ({ ...r, inviter_profile: byId[r.inviter_id] ?? null })) as PartyInvitation[]
    },
    enabled: !!user,
    refetchInterval: 5000,
  })
}

export function useSearchUsers(query: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!query.trim() || !user) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user.id)
        .limit(10)
      if (error) throw error
      return (data ?? []) as Profile[]
    },
    enabled: query.length >= 2,
  })
}

export function useSendFriendRequest() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (requestedId: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('friend_requests').insert({
        requester_id: user.id,
        requested_id: requestedId,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['search-users'] }),
  })
}

export function useRespondFriendRequest() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId, requesterId, accept }: { requestId: string; requesterId: string; accept: boolean }) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', requestId)
      if (error) throw error

      if (accept) {
        const { error: fe } = await supabase.from('friendships').insert({
          user_id: user.id,
          friend_id: requesterId,
        })
        if (fe) throw fe
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
      qc.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useRespondPartyInvitation() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ invitationId, partyId, accept }: { invitationId: string; partyId: string; accept: boolean }) => {
      if (!user) throw new Error('Not authenticated')

      if (accept) {
        // Fetch taken positions FIRST while invitation is still 'pending' (RLS allows it)
        const [{ data: members }, { data: profile }] = await Promise.all([
          supabase.from('party_members').select('preferred_position').eq('party_id', partyId),
          supabase.from('profiles').select('preferred_position').eq('id', user.id).single(),
        ])
        const taken = (members ?? []).map((m: { preferred_position: Position | null }) => m.preferred_position)
        const profilePos = (profile?.preferred_position as Position | null) ?? null
        const position = (profilePos && !taken.includes(profilePos))
          ? profilePos
          : ALL_POSITIONS.find((p) => !taken.includes(p)) ?? null

        // Now accept the invitation
        const { error } = await supabase
          .from('party_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitationId)
        if (error) throw error

        // Leave any current party before joining the new one
        const { data: currentMemberships } = await supabase
          .from('party_members')
          .select('party_id')
          .eq('user_id', user.id)
        if (currentMemberships?.length) {
          for (const m of currentMemberships) {
            const { error } = await supabase
              .from('party_members')
              .delete()
              .eq('party_id', m.party_id)
              .eq('user_id', user.id)
            if (error) throw error
          }
        }

        await supabase.from('party_members').insert({
          party_id: partyId,
          user_id: user.id,
          status: 'not_ready',
          preferred_position: position,
        })
      } else {
        await supabase
          .from('party_invitations')
          .update({ status: 'rejected' })
          .eq('id', invitationId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party-invitations'] })
      qc.invalidateQueries({ queryKey: ['lobby'] })
    },
  })
}
