import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Play, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { useIsAdmin } from '@/hooks/useProfile'
import { useToast } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getInitials, formatDate } from '@/lib/utils'
import type { Position, Profile, UserRole } from '@/types'

export default function AdminPage() {
  const navigate = useNavigate()
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Profile[]
    },
    enabled: !!isAdmin,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('*')
      return (data ?? []) as UserRole[]
    },
    enabled: !!isAdmin,
  })

  const { data: queueCount = 0 } = useQuery({
    queryKey: ['admin', 'queue'],
    queryFn: async () => {
      const { count } = await supabase.from('matchmaking_queue').select('*', { count: 'exact', head: true }).eq('status', 'waiting')
      return count ?? 0
    },
    enabled: !!isAdmin,
    refetchInterval: 5000,
  })

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

  const promoteAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role: 'admin' })
      if (error) throw error
    },
    onSuccess: () => { toast('Admin role granted', 'success'); qc.invalidateQueries({ queryKey: ['admin', 'roles'] }) },
  })

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
        <button onClick={() => refetchUsers()} className="text-muted hover:text-white transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-white">{users.length}</p>
          <p className="text-xs text-muted">Total Users</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-yellow-400">{queueCount}</p>
          <p className="text-xs text-muted">In Queue</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-primary">{roles.length}</p>
          <p className="text-xs text-muted">Admins</p>
        </Card>
      </div>

      {/* Matchmaking control */}
      <Card className="border-primary/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><Play size={16} /> Matchmaking Engine</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted mb-3">
            {queueCount} player{queueCount !== 1 ? 's' : ''} waiting. Need 7 to form a team, 14 (2 teams) to create a match.
          </p>
          <Button className="w-full" onClick={() => triggerMatchmaking.mutate()} loading={triggerMatchmaking.isPending}>
            <Play size={16} /> Process Queue Now
          </Button>
        </CardContent>
      </Card>

      {/* User list */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users size={16} /> All Users</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {users.map((u) => {
              const userRole = roles.find((r) => r.user_id === u.id)
              return (
                <div key={u.id} className="flex items-center gap-3 py-1">
                  <div className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {getInitials(u.full_name || u.username)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.full_name || u.username}</p>
                    <p className="text-xs text-muted">@{u.username} · {formatDate(u.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.preferred_position && (
                      <Badge variant="position" position={u.preferred_position as Position}>{u.preferred_position}</Badge>
                    )}
                    {userRole ? (
                      <Badge variant="success">{userRole.role}</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => promoteAdmin.mutate(u.id)}>
                        Make Admin
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
