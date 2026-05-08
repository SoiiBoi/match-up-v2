import { useNavigate } from 'react-router-dom'
import { Users, Zap, Trophy, Target, TrendingUp, Star } from 'lucide-react'
import { useProfile, useIsAdmin } from '@/hooks/useProfile'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'
import type { Position } from '@/types'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const { data: isAdmin } = useIsAdmin()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const winRate = profile && profile.games_played > 0
    ? Math.round((profile.wins / profile.games_played) * 100)
    : 0

  const stats = [
    { icon: Trophy, label: 'Games', value: profile?.games_played ?? 0, color: 'text-yellow-400' },
    { icon: Target, label: 'Goals', value: profile?.goals ?? 0, color: 'text-red-400' },
    { icon: Star, label: 'Assists', value: profile?.assists ?? 0, color: 'text-blue-400' },
    { icon: TrendingUp, label: 'Win Rate', value: `${winRate}%`, color: 'text-primary' },
  ]

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">
            Hey, {profile?.full_name?.split(' ')[0] ?? 'Player'} 👋
          </h1>
          <p className="text-sm text-muted">Ready for your next match?</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="text-xs text-primary border border-primary/30 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
          >
            Admin
          </button>
        )}
      </div>

      {/* Profile summary card */}
      <Card className="flex items-center gap-4 p-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
          {getInitials(profile?.full_name || profile?.username || user?.email || 'P')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{profile?.full_name || 'Add your name'}</p>
          <p className="text-sm text-muted">@{profile?.username}</p>
          {profile?.preferred_position && (
            <Badge variant="position" position={profile.preferred_position as Position} className="mt-1">
              {profile.preferred_position}
            </Badge>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="flex flex-col items-center py-3 px-2 gap-1">
            <Icon size={16} className={color} />
            <span className="text-lg font-bold text-white">{value}</span>
            <span className="text-xs text-muted">{label}</span>
          </Card>
        ))}
      </div>

      {/* Pitch decoration divider */}
      <div className="relative h-px bg-border my-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="px-3 bg-background text-primary/40 text-xs">⚽</span>
        </div>
      </div>

      {/* Find Match */}
      <Card className="relative overflow-hidden border-primary/30 cursor-pointer group" onClick={() => navigate('/lobby')}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
        <div className="relative flex items-center gap-4 p-2">
          <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Users size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Party Lobby</p>
            <p className="text-sm text-muted">Invite friends &amp; find a match together</p>
          </div>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('/lobby') }}>
            Enter
          </Button>
        </div>
      </Card>

      {/* Quick Match */}
      <Card className="relative overflow-hidden border-border cursor-pointer" onClick={() => navigate('/lobby?quick=1')}>
        <div className="relative flex items-center gap-4 p-2">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Zap size={22} className="text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Quick Match</p>
            <p className="text-sm text-muted">Solo queue — get placed in any open team</p>
          </div>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('/lobby?quick=1') }}>
            Join
          </Button>
        </div>
      </Card>
    </div>
  )
}
