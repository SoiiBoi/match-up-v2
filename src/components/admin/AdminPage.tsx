import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Play, Users, Search, X, Crown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useIsAdmin } from '@/hooks/useProfile'
import { useToast } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getInitials, formatDate, POSITIONS } from '@/lib/utils'
import type { Position, Profile } from '@/types'

export default function AdminPage() {
  const navigate = useNavigate()
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [userPositions, setUserPositions] = useState<Map<string, Position>>(new Map())
  const [testParty, setTestParty] = useState<Array<{ userId: string; username: string; position: Position }>>([])
  const [testPartyLeaderId, setTestPartyLeaderId] = useState<string | null>(null)

  const { data: totalUsers = 0 } = useQuery({
    queryKey: ['admin', 'user-count'],
    queryFn: async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      return count ?? 0
    },
    enabled: !!isAdmin,
  })

  const { data: searchResults = [] } = useQuery({
    queryKey: ['admin', 'search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20)
      if (error) throw error
      return data as Profile[]
    },
    enabled: searchQuery.length >= 2 && !!isAdmin,
  })

  const { data: queueEntries = [] } = useQuery({
    queryKey: ['admin', 'queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
      if (error) throw error
      if (!data?.length) return []
      const ids = data.map((e) => e.user_id)
      const { data: profiles } = await supabase.from('profiles').select('id, username, full_name, preferred_position').in('id', ids)
      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
      return data.map((e) => ({ ...e, profile: byId[e.user_id] ?? null }))
    },
    enabled: !!isAdmin,
    refetchInterval: 5000,
  })
  const queueCount = queueEntries.length

  const triggerMatchmaking = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/matchmaking-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'process_queue' }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      toast(`Matchmaking done: ${data.message || 'Processed'}`, 'success')
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Failed', 'error'),
  })

  const cancelAllQueue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('matchmaking_queue').delete().eq('status', 'waiting')
      if (error) throw error
    },
    onSuccess: () => {
      toast('Queue cleared', 'success')
      qc.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Failed', 'error'),
  })

  const addUserToQueue = useMutation({
    mutationFn: async ({ userId, position }: { userId: string; position: Position }) => {
      await supabase.from('matchmaking_queue').delete().eq('user_id', userId)
      const { error } = await supabase.from('matchmaking_queue').insert({
        user_id: userId,
        preferred_position: position,
        any_role: false,
        party_id: null,
      })
      if (error) throw error
    },
    onSuccess: (_, { position }) => {
      toast(`Added to queue as ${position}`, 'success')
      qc.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Failed', 'error'),
  })

  const queueTestParty = useMutation({
    mutationFn: async () => {
      if (!testParty.length) throw new Error('Party is empty')
      const partyId = crypto.randomUUID()
      const { error: partyErr } = await supabase
        .from('parties')
        .insert({ id: partyId, status: 'in_queue', leader_id: testPartyLeaderId })
      if (partyErr) throw partyErr
      await supabase.from('matchmaking_queue').delete().in('user_id', testParty.map((m) => m.userId))
      const { error } = await supabase.from('matchmaking_queue').insert(
        testParty.map((m) => ({
          user_id: m.userId,
          preferred_position: m.position,
          any_role: false,
          party_id: partyId,
        }))
      )
      if (error) throw error
      setTestParty([])
      setTestPartyLeaderId(null)
    },
    onSuccess: () => {
      toast(`Party of ${testParty.length} queued!`, 'success')
      qc.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Failed', 'error'),
  })

  function getPositionForUser(u: Profile): Position {
    return userPositions.get(u.id) ?? (u.preferred_position as Position) ?? POSITIONS[0]
  }

  const PARTY_COLORS = [
    'text-yellow-400', 'text-blue-400', 'text-purple-400', 'text-pink-400',
    'text-orange-400', 'text-teal-400', 'text-red-400', 'text-cyan-400',
  ]
  const partyIds = [...new Set(queueEntries.filter((e) => e.party_id).map((e) => e.party_id as string))]
  const partyColorMap: Record<string, string> = Object.fromEntries(
    partyIds.map((id, i) => [id, PARTY_COLORS[i % PARTY_COLORS.length]])
  )

  if (checkingAdmin) return null
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-4 mt-20 text-center">
        <p className="text-destructive">Access denied. Admins only.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('/')} className="text-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">Admin Panel</h1>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['admin'] })} className="text-muted hover:text-white transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-white">{totalUsers}</p>
          <p className="text-xs text-muted">Total Users</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-yellow-400">{queueCount}</p>
          <p className="text-xs text-muted">In Queue</p>
        </Card>
      </div>

      {/* Matchmaking control */}
      <Card className="border-primary/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><Play size={16} /> Matchmaking Engine</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted mb-3">
            {queueCount} player{queueCount !== 1 ? 's' : ''} waiting. Need 7 to form a team, 14 (2 teams) to create a match.
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => triggerMatchmaking.mutate()} loading={triggerMatchmaking.isPending}>
              <Play size={16} /> Process Queue Now
            </Button>
            <Button
              variant="destructive"
              disabled={queueCount === 0}
              loading={cancelAllQueue.isPending}
              onClick={() => cancelAllQueue.mutate()}
            >
              Cancel All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users size={16} /> Queue ({queueCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {queueEntries.length === 0 ? (
            <p className="text-sm text-muted text-center py-3">Queue is empty.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {queueEntries.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 py-1">
                  <span className="text-xs text-muted w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {getInitials(e.profile?.full_name || e.profile?.username || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">@{e.profile?.username ?? '?'}</p>
                    {e.party_id && (
                      <p className={`text-xs font-semibold ${partyColorMap[e.party_id] ?? 'text-primary'}`}>
                        Party {partyIds.indexOf(e.party_id) + 1}
                      </p>
                    )}
                  </div>
                  <Badge variant="position" position={e.preferred_position as Position}>
                    {e.any_role ? 'ANY' : e.preferred_position}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Party staging area */}
      {testParty.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Users size={16} /> Test Party ({testParty.length}/7)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 mb-3">
              {testParty.map((m) => (
                <div key={m.userId} className="flex items-center gap-3 py-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {getInitials(m.username)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">@{m.username}</p>
                  </div>
                  <Badge variant="position" position={m.position}>{m.position}</Badge>
                  <button
                    onClick={() => setTestPartyLeaderId(m.userId)}
                    className={`transition-colors flex-shrink-0 ${testPartyLeaderId === m.userId ? 'text-yellow-400' : 'text-muted hover:text-yellow-400'}`}
                    title="Set as leader"
                  >
                    <Crown size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setTestParty((prev) => {
                        const next = prev.filter((x) => x.userId !== m.userId)
                        if (m.userId === testPartyLeaderId) {
                          setTestPartyLeaderId(next[0]?.userId ?? null)
                        }
                        return next
                      })
                    }}
                    className="text-muted hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => queueTestParty.mutate()}
                loading={queueTestParty.isPending}
              >
                <Play size={14} /> Queue Test Party
              </Button>
              <Button variant="ghost" onClick={() => { setTestParty([]); setTestPartyLeaderId(null) }}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Users */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search size={16} /> Search Users</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} className="text-muted flex-shrink-0" />
            <Input
              placeholder="Search by username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-xs text-muted text-center py-2">Type at least 2 characters…</p>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-xs text-muted text-center py-4">No users found.</p>
          )}

          <div className="flex flex-col gap-2">
            {searchResults.map((u) => {
              const pos = getPositionForUser(u)
              const inQueue = queueEntries.some((e) => e.user_id === u.id)
              const inParty = testParty.some((m) => m.userId === u.id)
              return (
                <div key={u.id} className="flex flex-col gap-2 py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(u.full_name || u.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.full_name || u.username}</p>
                      <p className="text-xs text-muted">@{u.username} · {formatDate(u.created_at)}</p>
                    </div>
                    <select
                      value={pos}
                      onChange={(e) => setUserPositions((prev) => new Map(prev).set(u.id, e.target.value as Position))}
                      className="bg-surface-2 border border-border text-white text-xs rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:border-primary"
                    >
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 pl-12">
                    <Button
                      size="sm"
                      variant={inQueue ? 'ghost' : 'outline'}
                      className="flex-1"
                      loading={addUserToQueue.isPending}
                      onClick={() => addUserToQueue.mutate({ userId: u.id, position: pos })}
                    >
                      {inQueue ? 'In Queue' : 'Add to Queue'}
                    </Button>
                    {!inQueue && (
                      <Button
                        size="sm"
                        variant={inParty ? 'ghost' : 'outline'}
                        className="flex-1"
                        disabled={inParty || testParty.length >= 7}
                        onClick={() => {
                          const takenPositions = testParty.map((m) => m.position)
                          const assignedPos = takenPositions.includes(pos)
                            ? POSITIONS.find((p) => !takenPositions.includes(p)) ?? pos
                            : pos
                          if (testParty.length === 0) setTestPartyLeaderId(u.id)
                          setTestParty((prev) => [...prev, { userId: u.id, username: u.username ?? u.full_name ?? '?', position: assignedPos }])
                        }}
                      >
                        {inParty ? 'In Party' : 'Add to Party'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
