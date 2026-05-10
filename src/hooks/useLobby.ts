import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import type { Party, PartyMember, Friendship, Position } from '@/types'

const ALL_POSITIONS: Position[] = ['GK', 'ST', 'LW', 'RW', 'CM', 'LB', 'RB']

function pickPosition(profilePos: Position | null, taken: (Position | null)[]): Position | null {
  if (profilePos && !taken.includes(profilePos)) return profilePos
  return ALL_POSITIONS.find((p) => !taken.includes(p)) ?? null
}

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
        .limit(1)
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
        .select('*')
        .eq('party_id', partyId)
      if (error) throw error
      if (!data?.length) return []
      const ids = data.map((m) => m.user_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
      return data.map((m) => ({ ...m, profile: byId[m.user_id] ?? null })) as PartyMember[]
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_position')
        .eq('id', user.id)
        .single()

      const { data: party, error: pe } = await supabase
        .from('parties')
        .insert({ leader_id: user.id })
        .select()
        .single()
      if (pe) throw pe

      const position = pickPosition(profile?.preferred_position ?? null, [])
      const { error: me } = await supabase
        .from('party_members')
        .insert({ party_id: party.id, user_id: user.id, status: 'ready', preferred_position: position })
      if (me) throw me

      return party as Party
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lobby'] }),
  })
}

export function useLeaveParty() {
  const { user } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (partyId: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('party_members')
        .delete()
        .eq('party_id', partyId)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lobby'] }),
    onError: (err) => toast(err instanceof Error ? err.message : 'Failed to leave party', 'error'),
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

export function useSelectPosition() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ partyId, position }: { partyId: string; position: Position | null }) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('party_members')
        .update({ preferred_position: position })
        .eq('party_id', partyId)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lobby', 'members'] }),
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
        .select('*')
        .eq('user_id', user.id)
      if (!data?.length) return []
      const ids = data.map((f) => f.friend_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
      return data.map((f) => ({ ...f, profile: byId[f.friend_id] ?? null })) as Friendship[]
    },
    enabled: !!user,
    select: (data) => data.filter((f) => !partyMembers.some((m) => m.user_id === f.friend_id)),
  })
}
