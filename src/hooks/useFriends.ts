import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Friendship, FriendRequest, PartyInvitation, Profile } from '@/types'

export function useFriendsList() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('friendships')
        .select('*, profile:profiles!friendships_friend_id_fkey(*)')
        .eq('user_id', user.id)
      if (error) throw error
      return (data ?? []) as Friendship[]
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
        .select('*, requester_profile:profiles!friend_requests_requester_id_fkey(*)')
        .eq('requested_id', user.id)
        .eq('status', 'pending')
      if (error) throw error
      return (data ?? []) as FriendRequest[]
    },
    enabled: !!user,
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
        .select('*, inviter_profile:profiles!party_invitations_inviter_id_fkey(*), party:parties(*)')
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
      if (error) throw error
      return (data ?? []) as PartyInvitation[]
    },
    enabled: !!user,
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
        await supabase.from('friendships').insert([
          { user_id: user.id, friend_id: requesterId },
          { user_id: requesterId, friend_id: user.id },
        ])
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
      const { error } = await supabase
        .from('party_invitations')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', invitationId)
      if (error) throw error

      if (accept) {
        await supabase.from('party_members').insert({
          party_id: partyId,
          user_id: user.id,
          status: 'not_ready',
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party-invitations'] })
      qc.invalidateQueries({ queryKey: ['lobby'] })
    },
  })
}
