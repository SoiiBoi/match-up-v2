import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, UserPlus, CheckCircle, Circle, LogOut, Zap, Clock } from 'lucide-react'
import {
  useCurrentParty, usePartyMembers, useCreateParty,
  useLeaveParty, useToggleReady, useInviteFriend, useFriendsForInvite, useSelectPosition, useUpdateFormation,
} from '@/hooks/useLobby'
import { useFriendsList, useSendFriendRequest } from '@/hooks/useFriends'
import { useProfile } from '@/hooks/useProfile'
import InlinePitch from './InlinePitch'
import { useJoinQueue, useLeaveQueue, useQueueStatus, useJoinQueueAsParty } from '@/hooks/useMatchmaking'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getInitials, POSITIONS } from '@/lib/utils'
import { FORMATIONS, getFormation } from '@/lib/formations'
import type { Position, Formation } from '@/types'

export default function LobbyPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const quickMode = searchParams.get('quick') === '1'

  const { data: profile } = useProfile()
  const { data: party } = useCurrentParty()
  const { data: members = [] } = usePartyMembers(party?.id)
  const { data: queueEntry } = useQueueStatus()
  const { data: friendsToInvite = [] } = useFriendsForInvite(members)
  const { data: friendsList = [] } = useFriendsList()

  const createParty = useCreateParty()
  const leaveParty = useLeaveParty()
  const toggleReady = useToggleReady()
  const inviteFriend = useInviteFriend()
  const selectPosition = useSelectPosition()
  const updateFormation = useUpdateFormation()
  const joinQueue = useJoinQueue()
  const leaveQueue = useLeaveQueue()
  const joinQueueAsParty = useJoinQueueAsParty()
  const sendFriendRequest = useSendFriendRequest()

  const [selectedPosition, setSelectedPosition] = useState<Position>('CM')
  const [positionSet, setPositionSet] = useState(false)
  const [anyRole, setAnyRole] = useState(false)
  const [tick, setTick] = useState(0)
  const [showTeammates, setShowTeammates] = useState(false)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!positionSet && profile?.preferred_position) {
      setSelectedPosition(profile.preferred_position as Position)
      setPositionSet(true)
    }
  }, [profile?.preferred_position, positionSet])

  const isLeader = party?.leader_id === user?.id
  const myMember = members.find((m) => m.user_id === user?.id)
  const allReady = members.length > 0 && members.every((m) => m.status === 'ready')
  const inQueue = !!queueEntry

  const waitSeconds = queueEntry
    ? Math.max(0, Math.floor((Date.now() - new Date(queueEntry.joined_at).getTime()) / 1000))
    : 0

  useEffect(() => {
    if (!inQueue) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
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
      await leaveQueue.mutateAsync(queueEntry?.party_id ?? undefined)
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
      canCancel={!queueEntry.party_id || isLeader}
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
              {/* Interactive pitch */}
              {user && (
                <InlinePitch
                  members={members}
                  currentUserId={user.id}
                  formation={(party.formation ?? 'balanced') as Formation}
                  selecting={selectPosition.isPending}
                  onSelect={(pos) => selectPosition.mutate({ partyId: party.id, position: pos })}
                />
              )}

              {/* Toggle teammates */}
              <button
                onClick={() => setShowTeammates((v) => !v)}
                className="mt-3 w-full flex items-center justify-between border-t border-border pt-2 text-xs text-muted hover:text-white transition-colors"
              >
                <span>Teammates ({members.length}/7)</span>
                <span>{showTeammates ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {/* Slim member list */}
              {showTeammates && (
              <div className="flex flex-col gap-1.5 mt-2">
                {members.map((m) => {
                  const isMe = m.user_id === user?.id
                  const isFriend = friendsList.some((f) => f.friend_id === m.user_id)
                  const alreadyAdded = addedIds.has(m.user_id)
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                        {getInitials(m.profile?.full_name || m.profile?.username || 'P')}
                      </div>
                      <span className="text-xs text-white flex-1 truncate min-w-0">
                        {m.profile?.full_name || m.profile?.username}
                        {party.leader_id === m.user_id && <span className="text-primary ml-1">★</span>}
                      </span>
                      {!isMe && !isFriend && (
                        <button
                          disabled={alreadyAdded || sendFriendRequest.isPending}
                          onClick={() => sendFriendRequest.mutate(m.user_id, {
                            onSuccess: () => setAddedIds((prev) => new Set(prev).add(m.user_id)),
                          })}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors flex-shrink-0 ${
                            alreadyAdded
                              ? 'border-primary/30 text-primary cursor-default'
                              : 'border-border text-muted hover:border-primary hover:text-primary'
                          }`}
                        >
                          {alreadyAdded ? '✓' : '+Add'}
                        </button>
                      )}
                      {m.status === 'ready'
                        ? <CheckCircle size={13} className="text-primary flex-shrink-0" />
                        : <Circle size={13} className="text-muted flex-shrink-0" />
                      }
                    </div>
                  )
                })}
                {Array.from({ length: 7 - members.length }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 opacity-30">
                    <div className="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center">
                      <UserPlus size={12} className="text-muted" />
                    </div>
                    <span className="text-xs text-muted">Open slot</span>
                  </div>
                ))}
              </div>
              )}

              {/* My position label */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted">My Position</span>
                <span className={`text-xs font-semibold ${myMember?.preferred_position ? 'text-white' : 'text-yellow-400'}`}>
                  {myMember?.preferred_position ?? 'Tap pitch to pick'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Formation selector */}
          {(() => {
            const currentFormation = (party.formation ?? 'balanced') as Formation
            const formationDef = getFormation(currentFormation)
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    🗺️ Formation
                    <span className="text-xs font-normal text-muted ml-1">
                      {formationDef.label} · {formationDef.style}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLeader ? (
                    <div className="flex flex-wrap gap-2">
                      {FORMATIONS.map((f) => (
                        <button
                          key={f.id}
                          disabled={updateFormation.isPending}
                          onClick={() => updateFormation.mutate({ partyId: party.id, formation: f.id, newPositions: f.positions })}
                          className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                            currentFormation === f.id
                              ? 'bg-primary/20 border-primary/60 text-primary font-semibold'
                              : 'bg-surface-2 border-border text-muted hover:text-white hover:border-white/30'
                          }`}
                        >
                          <span className="font-mono font-bold">{f.shape}</span>
                          <span className="text-[10px] opacity-70 mt-0.5">{f.style}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      <span className="text-white font-semibold">{formationDef.shape}</span> — {formationDef.style}
                      <span className="text-xs ml-2 opacity-50">(only leader can change)</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })()}

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
          {members.length < 7 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus size={16} /> Invite Friends</CardTitle></CardHeader>
              <CardContent>
                {friendsToInvite.length === 0 ? (
                  <p className="text-sm text-muted text-center py-2">
                    No friends to invite yet. Go to <strong className="text-white">Friends → Search</strong> to add players first.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {friendsToInvite.map(({ friend_id, profile: friendProfile }) => (
                      <div key={friend_id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(friendProfile?.full_name || friendProfile?.username || 'P')}
                        </div>
                        <span className="text-sm text-white flex-1 truncate">{friendProfile?.full_name || friendProfile?.username}</span>
                        <Button
                          size="sm"
                          variant={invitedIds.has(friend_id) ? 'ghost' : 'outline'}
                          disabled={invitedIds.has(friend_id)}
                          loading={inviteFriend.isPending}
                          onClick={() => inviteFriend.mutate(
                            { friendId: friend_id, partyId: party.id },
                            { onSuccess: () => setInvitedIds((prev) => new Set(prev).add(friend_id)) }
                          )}
                        >
                          {invitedIds.has(friend_id) ? '✓ Invited' : 'Invite'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function MatchFindingScreen({
  waitSeconds, position, isParty, partySize, canCancel, onCancel, cancelling,
}: {
  waitSeconds: number; position: Position; isParty: boolean; partySize: number
  canCancel: boolean; onCancel: () => void; cancelling: boolean
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
      {canCancel ? (
        <Button variant="destructive" onClick={onCancel} loading={cancelling}>
          Cancel Search
        </Button>
      ) : (
        <p className="text-xs text-muted">Only the party leader can cancel</p>
      )}
    </div>
  )
}
