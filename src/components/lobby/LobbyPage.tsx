import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, UserPlus, CheckCircle, Circle, LogOut, Zap, Clock } from 'lucide-react'
import {
  useCurrentParty, usePartyMembers, useCreateParty,
  useLeaveParty, useToggleReady, useInviteFriend, useFriendsForInvite,
} from '@/hooks/useLobby'
import { useJoinQueue, useLeaveQueue, useQueueStatus, useJoinQueueAsParty } from '@/hooks/useMatchmaking'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getInitials, POSITIONS } from '@/lib/utils'
import type { Position } from '@/types'

export default function LobbyPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const quickMode = searchParams.get('quick') === '1'

  const { data: party } = useCurrentParty()
  const { data: members = [] } = usePartyMembers(party?.id)
  const { data: queueEntry } = useQueueStatus()
  const { data: friendsToInvite = [] } = useFriendsForInvite(members)

  const createParty = useCreateParty()
  const leaveParty = useLeaveParty()
  const toggleReady = useToggleReady()
  const inviteFriend = useInviteFriend()
  const joinQueue = useJoinQueue()
  const leaveQueue = useLeaveQueue()
  const joinQueueAsParty = useJoinQueueAsParty()

  const [selectedPosition, setSelectedPosition] = useState<Position>('CM')
  const [anyRole, setAnyRole] = useState(false)
  const [waitSeconds, setWaitSeconds] = useState(0)

  const isLeader = party?.leader_id === user?.id
  const myMember = members.find((m) => m.user_id === user?.id)
  const allReady = members.length > 0 && members.every((m) => m.status === 'ready')
  const inQueue = !!queueEntry

  useEffect(() => {
    if (!inQueue) { setWaitSeconds(0); return }
    const interval = setInterval(() => setWaitSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [inQueue])

  async function handleJoinSolo() {
    try {
      await joinQueue.mutateAsync({ position: selectedPosition, anyRole })
      toast('Joined the matchmaking queue!', 'success')
    } catch {
      toast('Failed to join queue', 'error')
    }
  }

  async function handleStartMatchmaking() {
    if (!party) return
    try {
      await joinQueueAsParty.mutateAsync({
        partyId: party.id,
        members: members.map((m) => ({ user_id: m.user_id, preferred_position: m.preferred_position })),
      })
      toast('Party entered matchmaking queue!', 'success')
    } catch {
      toast('Failed to start matchmaking', 'error')
    }
  }

  async function handleLeaveQueue() {
    try {
      await leaveQueue.mutateAsync()
      toast('Left the queue', 'info')
    } catch {
      toast('Failed to leave queue', 'error')
    }
  }

  if (inQueue) {
    return <MatchFindingScreen
      waitSeconds={waitSeconds}
      position={queueEntry.preferred_position}
      isParty={!!queueEntry.party_id}
      partySize={members.length}
      onCancel={handleLeaveQueue}
      cancelling={leaveQueue.isPending}
    />
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Party Lobby</h1>
        <p className="text-sm text-muted">Form a squad and find a 7v7 match</p>
      </div>

      {/* Quick Match (solo) */}
      {(!party || quickMode) && (
        <Card className="border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Zap size={16} /> Quick Match (Solo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-muted mb-2">Select your position</p>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPosition(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        selectedPosition === p
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'bg-surface-2 border-border text-muted hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={anyRole}
                  onChange={(e) => setAnyRole(e.target.checked)}
                  className="accent-primary"
                />
                I can play any position
              </label>
              <Button onClick={handleJoinSolo} loading={joinQueue.isPending}>
                <Zap size={16} /> Find Match Solo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Party section */}
      {!party ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users size={16} /> Create a Party</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted mb-3">Invite friends and play as a squad!</p>
            <Button variant="outline" className="w-full" onClick={() => createParty.mutate()} loading={createParty.isPending}>
              <Users size={16} /> Create Party
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Party members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Users size={16} /> Your Party ({members.length}/7)</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => leaveParty.mutate(party.id)} loading={leaveParty.isPending}>
                  <LogOut size={14} /> Leave
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-1">
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {getInitials(m.profile?.full_name || m.profile?.username || 'P')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.profile?.full_name || m.profile?.username}</p>
                      {party.leader_id === m.user_id && <span className="text-xs text-primary">Leader</span>}
                    </div>
                    {m.preferred_position && (
                      <Badge variant="position" position={m.preferred_position as Position}>{m.preferred_position}</Badge>
                    )}
                    {m.status === 'ready'
                      ? <CheckCircle size={16} className="text-primary flex-shrink-0" />
                      : <Circle size={16} className="text-muted flex-shrink-0" />
                    }
                  </div>
                ))}
                {Array.from({ length: 7 - members.length }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-1 opacity-30">
                    <div className="w-9 h-9 rounded-full border border-dashed border-border flex items-center justify-center">
                      <UserPlus size={14} className="text-muted" />
                    </div>
                    <span className="text-sm text-muted">Open slot</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ready / Start */}
          {isLeader ? (
            <Button
              size="lg"
              className="w-full"
              disabled={!allReady || members.length < 2}
              onClick={handleStartMatchmaking}
              loading={joinQueueAsParty.isPending}
            >
              {allReady ? '⚽ Start Finding Match' : 'Waiting for all players to be ready...'}
            </Button>
          ) : (
            <Button
              size="lg"
              variant={myMember?.status === 'ready' ? 'outline' : 'primary'}
              className="w-full"
              onClick={() => party && myMember && toggleReady.mutate({ partyId: party.id, currentStatus: myMember.status })}
              loading={toggleReady.isPending}
            >
              {myMember?.status === 'ready' ? '✓ Ready (click to unready)' : 'Mark as Ready'}
            </Button>
          )}

          {/* Invite friends */}
          {friendsToInvite.length > 0 && members.length < 7 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus size={16} /> Invite Friends</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {friendsToInvite.map(({ friend_id, profile }) => (
                    <div key={friend_id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(profile?.full_name || profile?.username || 'P')}
                      </div>
                      <span className="text-sm text-white flex-1 truncate">{profile?.full_name || profile?.username}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => inviteFriend.mutate({ friendId: friend_id, partyId: party.id })}
                        loading={inviteFriend.isPending}
                      >
                        Invite
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function MatchFindingScreen({
  waitSeconds, position, isParty, partySize, onCancel, cancelling,
}: {
  waitSeconds: number; position: Position; isParty: boolean; partySize: number
  onCancel: () => void; cancelling: boolean
}) {
  const mins = Math.floor(waitSeconds / 60)
  const secs = waitSeconds % 60

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-t-primary border-transparent animate-spin absolute inset-0" />
          <span className="text-4xl">⚽</span>
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Searching for a Match...</h2>
        <p className="text-sm text-muted mt-1">
          {isParty ? `Party of ${partySize} · ` : ''}Position: {position}
        </p>
      </div>
      <div className="flex items-center gap-2 text-primary">
        <Clock size={18} />
        <span className="text-2xl font-mono font-bold">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>
      <p className="text-xs text-muted">Estimated wait: 3–10 minutes</p>
      <Button variant="destructive" onClick={onCancel} loading={cancelling}>
        Cancel Search
      </Button>
    </div>
  )
}
