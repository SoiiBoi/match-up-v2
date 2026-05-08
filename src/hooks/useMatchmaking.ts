import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Position, QueueEntry } from '@/types'

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
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('matchmaking_queue')
        .delete()
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
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
