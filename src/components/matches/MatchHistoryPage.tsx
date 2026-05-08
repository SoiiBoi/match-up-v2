import { useState } from 'react'
import { ChevronDown, ChevronUp, Trophy, Calendar, MapPin } from 'lucide-react'
import { useMatchHistory } from '@/hooks/useMatchHistory'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getInitials, formatDate } from '@/lib/utils'
import type { Match, Position } from '@/types'

export default function MatchHistoryPage() {
  const { data: matches = [], isLoading } = useMatchHistory()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Match History</h1>
        <p className="text-sm text-muted">{matches.length} match{matches.length !== 1 ? 'es' : ''} played</p>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Trophy size={36} className="text-muted" />
          <p className="text-muted text-sm">No matches yet — get into a game!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)

  const myTeam = match.team_a?.members.some((m) => m.user_id === user?.id) ? match.team_a : match.team_b
  const opponentTeam = myTeam?.id === match.team_a?.id ? match.team_b : match.team_a

  const result = match.result
  const myScore = myTeam?.id === match.team_a?.id ? result?.team_a_score : result?.team_b_score
  const oppScore = myTeam?.id === match.team_a?.id ? result?.team_b_score : result?.team_a_score

  let outcome: 'Win' | 'Loss' | 'Draw' | 'Pending' = 'Pending'
  if (result) {
    if (myScore === undefined || oppScore === undefined) outcome = 'Pending'
    else if (myScore > oppScore) outcome = 'Win'
    else if (myScore < oppScore) outcome = 'Loss'
    else outcome = 'Draw'
  }

  const outcomeStyle = {
    Win: 'success' as const,
    Loss: 'danger' as const,
    Draw: 'default' as const,
    Pending: 'warning' as const,
  }

  return (
    <Card>
      <button
        className="w-full text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={outcomeStyle[outcome]}>{outcome}</Badge>
              {result && (
                <span className="text-sm font-bold text-white">{myScore} – {oppScore}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(match.created_at)}</span>
              <span className="flex items-center gap-1"><MapPin size={11} />{match.venue}</span>
            </div>
          </div>
          <div className="text-muted">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
          <TeamColumn label="Your Team" team={myTeam} highlight />
          <TeamColumn label="Opponents" team={opponentTeam} />
        </div>
      )}
    </Card>
  )
}

function TeamColumn({
  label, team, highlight = false,
}: {
  label: string
  team: Match['team_a'] | null | undefined
  highlight?: boolean
}) {
  if (!team) return null
  return (
    <div>
      <p className={`text-xs font-semibold mb-2 ${highlight ? 'text-primary' : 'text-muted'}`}>{label}</p>
      <div className="flex flex-col gap-1.5">
        {team.members.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {getInitials(m.profile?.full_name || m.profile?.username || 'P')}
            </div>
            <span className="text-xs text-white truncate flex-1">{m.profile?.username || 'Player'}</span>
            <Badge variant="position" position={m.assigned_position as Position} className="text-xs px-1">
              {m.assigned_position}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
