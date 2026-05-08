import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Party, PartyMember, Friendship } from '@/types'

export function useCurrentParty() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['lobby', 'party', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase
        .from('party_members')
        .select('party_id, party:parties!inner(id, leader_id, status, created_at, updated_at)')
        .eq('user_id', user.id)
        .eq('party.status', 'active')
        .maybeSingle()
      if (!data) return null
      return data.party as unknown as Party
    },
    enabled: !!user,
    refetchInterval: 5000,
  })
}

export function usePartyMembers(partyId: string | undefined) {
  return useQuery({
    queryKey: ['lobby', 'members', partyId],
    queryFn: async () => {
      if (!partyId) return []
      const { data, error } = await supabase
        .from('party_members')
        .select('*, profile:profiles(*)')
        .eq('party_id', partyId)
      if (error) throw error
      return (data ?? []) as PartyMember[]
    },
    enabled: !!partyId,
    refetchInterval: 5000,
  })
}

export function useCreateParty() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { data: party, error: pe } = await supabase
        .from('parties')
        .insert({ leader_id: user.id })
        .select()
        .single()
      if (pe) throw pe

      const { error: me } = await supabase
        .from('party_members')
        .insert({ party_id: party.id, user_id: user.id, status: 'ready' })
      if (me) throw me

      return party as Party
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lobby'] }),
  })
}

export function useLeaveParty() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (partyId: string) => {
      if (!user) throw new Error('Not authenticated')
      await supabase.from('party_members').delete().eq('party_id', partyId).eq('user_id', user.id)
      const { count } = await supabase.from('party_members').select('*', { count: 'exact', head: true }).eq('party_id', partyId)
      if (!count) {
        await supabase.from('parties').update({ status: 'disbanded' }).eq('id', partyId)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lobby'] }),
  })
}

export function useToggleReady() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ partyId, currentStatus }: { partyId: string; currentStatus: 'ready' | 'not_ready' }) => {
      if (!user) throw new Error('Not authenticated')
      const newStatus = currentStatus === 'ready' ? 'not_ready' : 'ready'
      await supabase.from('party_members').update({ status: newStatus }).eq('party_id', partyId).eq('user_id', user.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lobby', 'members'] }),
  })
}

export function useInviteFriend() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ friendId, partyId }: { friendId: string; partyId: string }) => {
      if (!user) throw new Error('Not authenticated')
      await supabase.from('party_invitations').insert({
        party_id: partyId,
        inviter_id: user.id,
        invitee_id: friendId,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lobby'] }),
  })
}

export function useFriendsForInvite(partyMembers: PartyMember[]) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['friends-for-invite', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase
        .from('friendships')
        .select('*, profile:profiles!friendships_friend_id_fkey(*)')
        .eq('user_id', user.id)
      return (data ?? []) as Friendship[]
    },
    enabled: !!user,
    select: (data) => data.filter((f) => !partyMembers.some((m) => m.user_id === f.friend_id)),
  })
}
