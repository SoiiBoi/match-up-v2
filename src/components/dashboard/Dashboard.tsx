import { useNavigate } from 'react-router-dom'
import { Users, Zap, Trophy, Target, TrendingUp, Star, LogOut, Clock, CheckCircle2 } from 'lucide-react'
import { useProfile, useIsAdmin } from '@/hooks/useProfile'
import { useCurrentParty, usePartyMembers } from '@/hooks/useLobby'
import { useQueueStatus, useActiveMatch, useActiveGame } from '@/hooks/useMatchmaking'
import type { ActiveGameData } from '@/hooks/useMatchmaking'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInitials, formatDate, formatTime, TEAM_NAMES, TEAM_COLORS, POSITION_COLORS } from '@/lib/utils'
import MiniPitch from './MiniPitch'
import type { Match, Position, TeamMember, PartyMember } from '@/types'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const { data: isAdmin } = useIsAdmin()
  const { data: party } = useCurrentParty()
  const { data: members = [] } = usePartyMembers(party?.id)
  const { data: queueEntry } = useQueueStatus()
  const { data: activeMatch } = useActiveMatch()
  const { data: activeGame } = useActiveGame()
  const myMember = members.find((m) => m.user_id === user?.id)
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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-xs text-primary border border-primary/30 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
            >
              Admin
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="text-muted hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
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

      {/* In-Game card — highest priority */}
      {activeGame?.phase === 'in_game' ? (
        <InGameDashboardCard gameData={activeGame} userId={user?.id ?? ''} />
      ) : activeGame?.phase === 'matched_waiting' ? (
        <MatchedWaitingDashboardCard gameData={activeGame} userId={user?.id ?? ''} />
      ) : activeMatch ? (
        <MatchFoundCard match={activeMatch} userId={user?.id ?? ''} onView={() => navigate('/matches')} />
      ) : queueEntry ? (
        /* Searching card */
        <Card className="border-yellow-500/30 cursor-pointer" onClick={() => navigate('/lobby')}>
          <CardContent className="pt-4 pb-3 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full border-2 border-yellow-500/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-t-yellow-400 border-transparent animate-spin absolute inset-0 rounded-full" />
                <span className="text-xl">⚽</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-yellow-400">Searching for Match...</p>
              <p className="text-xs text-muted mt-0.5">
                Position: {queueEntry.preferred_position}
                {queueEntry.party_id && ' · Party queue'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Clock size={11} className="text-muted" />
                <span className="text-xs text-muted">Tap to view lobby</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : party ? (
        /* In-party lobby status card */
        <Card
          className="border-primary/30 cursor-pointer hover:bg-surface-2 transition-colors"
          onClick={() => navigate('/lobby')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <p className="font-bold text-white">Party Lobby</p>
                <p className={`text-sm font-medium ${myMember?.status === 'ready' ? 'text-primary' : 'text-yellow-400'}`}>
                  Status: {myMember?.status === 'ready' ? 'Ready' : 'Not Ready'}
                </p>
                <p className="text-xs text-muted">player: {members.length}/7</p>
                <p className="text-xs font-semibold text-white mt-1">Teammate List</p>
                {members.map((m) => (
                  <p key={m.id} className="text-xs text-muted truncate">
                    <span className="text-white/70">{m.preferred_position ?? '?'}</span>
                    {': @'}{m.profile?.username || 'unknown'}
                    {m.user_id === user?.id && <span className="text-primary"> (You)</span>}
                  </p>
                ))}
              </div>
              {user && <MiniPitch members={members} currentUserId={user.id} formation={party.formation} />}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Default: no party, no queue */
        <>
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
        </>
      )}
    </div>
  )
}

function MatchFoundCard({ match, userId, onView }: { match: Match; userId: string; onView: () => void }) {
  const myTeam = match.team_a?.members?.some((m) => m.user_id === userId) ? match.team_a : match.team_b
  const oppTeam = myTeam === match.team_a ? match.team_b : match.team_a

  return (
    <Card className="border-primary/60 bg-primary/5 cursor-pointer" onClick={onView}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
          <p className="font-bold text-primary">Match Found!</p>
          {match.scheduled_at && (
            <p className="text-xs text-muted ml-auto">{formatDate(match.scheduled_at)}</p>
          )}
        </div>

        {match.game?.venue && (
          <p className="text-xs text-muted mb-3">📍 {match.game.venue}</p>
        )}

        <div className="flex items-center gap-2">
          {/* My team */}
          <div className="flex-1">
            <p className="text-xs text-primary font-semibold mb-1">Your Team</p>
            {myTeam?.members?.slice(0, 4).map((m) => (
              <p key={m.id} className="text-xs text-muted truncate">
                <span className="text-white/70">{m.assigned_position}</span>: @{m.profile?.username ?? '?'}
                {m.user_id === userId && <span className="text-primary"> (You)</span>}
              </p>
            ))}
            {(myTeam?.members?.length ?? 0) > 4 && (
              <p className="text-xs text-muted">+{(myTeam?.members?.length ?? 0) - 4} more</p>
            )}
          </div>

          <div className="text-lg font-bold text-muted px-2">VS</div>

          {/* Opponent team */}
          <div className="flex-1 text-right">
            <p className="text-xs text-muted font-semibold mb-1">Opponents</p>
            {oppTeam?.members?.slice(0, 4).map((m) => (
              <p key={m.id} className="text-xs text-muted truncate">
                @{m.profile?.username ?? '?'} <span className="text-white/70">{m.assigned_position}</span>
              </p>
            ))}
            {(oppTeam?.members?.length ?? 0) > 4 && (
              <p className="text-xs text-muted">+{(oppTeam?.members?.length ?? 0) - 4} more</p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted text-center mt-3">Tap to view match details →</p>
      </CardContent>
    </Card>
  )
}

function InGameDashboardCard({ gameData, userId }: { gameData: ActiveGameData; userId: string }) {
  const navigate = useNavigate()
  const { game, myTeam, allMatches } = gameData

  const teamOrder: string[] = []
  const seen = new Set<string>()
  for (const m of allMatches) {
    if (!seen.has(m.team_a_id)) { teamOrder.push(m.team_a_id); seen.add(m.team_a_id) }
    if (!seen.has(m.team_b_id)) { teamOrder.push(m.team_b_id); seen.add(m.team_b_id) }
    if (teamOrder.length === 4) break
  }
  const myTeamIdx = teamOrder.indexOf(myTeam.id)
  const myColor = TEAM_COLORS[myTeamIdx] ?? TEAM_COLORS[0]
  const myName = TEAM_NAMES[myTeamIdx] ?? 'Your Team'

  const POSITION_ORDER: Partial<Record<Position, number>> = {
    GK: 0, LB: 1, CB: 2, RB: 3, LM: 4, CM: 5, RM: 6, LW: 7, ST: 8, RW: 9,
  }
  const sortedMembers = [...myTeam.members].sort((a, b) =>
    (POSITION_ORDER[(a as TeamMember).assigned_position as Position] ?? 99) -
    (POSITION_ORDER[(b as TeamMember).assigned_position as Position] ?? 99)
  )
  const pitchMembers = myTeam.members.map((m) => ({
    ...m,
    preferred_position: (m as TeamMember).assigned_position,
  })) as unknown as PartyMember[]
  const assignedPositions = sortedMembers.map((m) => (m as TeamMember).assigned_position as Position)

  const nextMatch = allMatches.find(
    (m) => (m.team_a_id === myTeam.id || m.team_b_id === myTeam.id) && m.status === 'scheduled'
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-white text-base">⚽ You're in a Game!</p>
          <p className="text-xs text-muted">Round-robin format — 4 teams, 6 matches</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-white">
            Game Start at {allMatches[0]?.scheduled_at ? formatTime(allMatches[0].scheduled_at) : '—'}
          </p>
          <p className="text-xs text-muted">{game?.venue ?? ''}</p>
        </div>
      </div>

      <Card className={myColor.border}>
        <CardHeader>
          <CardTitle className={`text-sm flex items-center gap-2 ${myColor.text}`}>
            <Users size={14} /> {myName} ({myTeam.members.length}/7)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {sortedMembers.map((m) => {
                const isMe = m.user_id === userId
                const profile = (m as TeamMember).profile ?? null
                const displayName = profile?.full_name && profile.full_name.length <= 14
                  ? profile.full_name
                  : `@${profile?.username ?? '?'}`
                return (
                  <button
                    key={m.user_id}
                    className="flex items-center gap-1.5 w-full text-left hover:bg-white/5 rounded-lg px-1 py-0.5 transition-colors"
                    onClick={() => !isMe && navigate(`/profile/${m.user_id}`)}
                    disabled={isMe}
                  >
                    <div className={`w-7 h-7 rounded-full ${myColor.bg} border ${myColor.border} flex items-center justify-center ${myColor.text} text-[10px] font-bold flex-shrink-0`}>
                      {getInitials(profile?.full_name || profile?.username || '?')}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold flex-shrink-0 ${POSITION_COLORS[(m as TeamMember).assigned_position as Position]}`}>
                      {(m as TeamMember).assigned_position}
                    </span>
                    <span className="text-xs text-white flex-1 truncate">
                      {displayName}
                      {isMe && <span className={`${myColor.text} ml-1`}>(You)</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            <MiniPitch members={pitchMembers} currentUserId={userId} customPositions={assignedPositions} />
          </div>
        </CardContent>
      </Card>

      {nextMatch && (() => {
        const ai = teamOrder.indexOf(nextMatch.team_a_id)
        const bi = teamOrder.indexOf(nextMatch.team_b_id)
        const aName = TEAM_NAMES[ai] ?? `Team ${ai + 1}`
        const bName = TEAM_NAMES[bi] ?? `Team ${bi + 1}`
        const aColor = TEAM_COLORS[ai] ?? TEAM_COLORS[0]
        const bColor = TEAM_COLORS[bi] ?? TEAM_COLORS[0]
        const matchIdx = allMatches.indexOf(nextMatch)
        return (
          <Card key={nextMatch.id}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted mb-2 font-semibold">Next match</p>
              <div className="flex items-center gap-2 p-2 rounded-lg border border-primary/40 bg-primary/5">
                <span className="text-xs text-muted w-5 text-center flex-shrink-0">#{matchIdx + 1}</span>
                <div className="flex-1 text-center text-xs font-medium">
                  <span className={aColor.text}>{aName}</span>
                  <span className="text-muted"> vs </span>
                  <span className={bColor.text}>{bName}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted">{formatTime(nextMatch.scheduled_at)}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">scheduled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      <button
        className="text-xs text-muted text-center hover:text-white transition-colors"
        onClick={() => navigate('/lobby')}
      >
        View full schedule →
      </button>
    </div>
  )
}

function MatchedWaitingDashboardCard({ gameData, userId }: { gameData: ActiveGameData; userId: string }) {
  const { myTeam } = gameData
  const POSITION_ORDER: Partial<Record<Position, number>> = {
    GK: 0, LB: 1, CB: 2, RB: 3, LM: 4, CM: 5, RM: 6, LW: 7, ST: 8, RW: 9,
  }
  const sortedMembers = [...myTeam.members].sort((a, b) =>
    (POSITION_ORDER[(a as TeamMember).assigned_position as Position] ?? 99) -
    (POSITION_ORDER[(b as TeamMember).assigned_position as Position] ?? 99)
  )
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">You're Matched!</h2>
        <p className="text-sm text-muted mt-1">Your team is ready. Waiting for 3 more teams...</p>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users size={14} /> Your Team ({myTeam.members.length}/7)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            {sortedMembers.map((m) => {
              const isMe = m.user_id === userId
              const profile = (m as TeamMember).profile ?? null
              return (
                <div key={m.user_id} className="flex items-center gap-2 px-1 py-0.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-bold flex-shrink-0">
                    {getInitials(profile?.full_name || profile?.username || '?')}
                  </div>
                  <span className="text-xs text-white flex-1 truncate">
                    {profile?.full_name || profile?.username}
                    {isMe && <span className="text-emerald-400 ml-1">(You)</span>}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold flex-shrink-0 ${POSITION_COLORS[(m as TeamMember).assigned_position as Position]}`}>
                    {(m as TeamMember).assigned_position}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted text-center">Game will start once all 4 teams are ready</p>
    </div>
  )
}
