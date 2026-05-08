import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserCheck, Users, Mail, RefreshCw, Check, X } from 'lucide-react'
import {
  useFriendsList, useFriendRequests, usePartyInvitations,
  useSearchUsers, useSendFriendRequest, useRespondFriendRequest,
  useRespondPartyInvitation,
} from '@/hooks/useFriends'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getInitials, formatDate } from '@/lib/utils'
import type { Position } from '@/types'

type Tab = 'friends' | 'requests' | 'invites' | 'search'

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: friends = [], refetch: refetchFriends } = useFriendsList()
  const { data: requests = [], refetch: refetchRequests } = useFriendRequests()
  const { data: invitations = [], refetch: refetchInvites } = usePartyInvitations()
  const { data: searchResults = [] } = useSearchUsers(searchQuery)

  const sendRequest = useSendFriendRequest()
  const respondRequest = useRespondFriendRequest()
  const respondInvite = useRespondPartyInvitation()

  const navigate = useNavigate()

  function refetchAll() {
    refetchFriends(); refetchRequests(); refetchInvites()
  }

  const tabs = [
    { id: 'friends' as Tab, label: 'Friends', icon: Users, count: friends.length },
    { id: 'requests' as Tab, label: 'Requests', icon: UserCheck, count: requests.length },
    { id: 'invites' as Tab, label: 'Invites', icon: Mail, count: invitations.length },
    { id: 'search' as Tab, label: 'Search', icon: Search, count: 0 },
  ]

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-white">Friends</h1>
        <button onClick={refetchAll} className="text-muted hover:text-white transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface rounded-lg p-1 gap-1">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
              tab === id ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-primary/30' : 'bg-surface-2'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends List */}
      {tab === 'friends' && (
        friends.length === 0 ? (
          <EmptyState icon={<Users size={32} className="text-muted" />} message="No friends yet. Search for players to add!" />
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map(({ id, friend_id, profile }) => (
              <Card key={id} className="flex items-center gap-3 cursor-pointer hover:bg-surface-2 transition-colors" onClick={() => navigate(`/profile/${friend_id}`)}>
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                  {getInitials(profile?.full_name || profile?.username || 'P')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{profile?.full_name || profile?.username}</p>
                  <p className="text-xs text-muted">@{profile?.username}</p>
                </div>
                {profile?.preferred_position && (
                  <Badge variant="position" position={profile.preferred_position as Position}>
                    {profile.preferred_position}
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      {/* Friend Requests */}
      {tab === 'requests' && (
        requests.length === 0 ? (
          <EmptyState icon={<UserCheck size={32} className="text-muted" />} message="No pending friend requests." />
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map(({ id, requester_id, requester_profile }) => (
              <Card key={id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {getInitials(requester_profile?.full_name || requester_profile?.username || 'P')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{requester_profile?.full_name || requester_profile?.username}</p>
                  <p className="text-xs text-muted">@{requester_profile?.username}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={respondRequest.isPending}
                    onClick={() => respondRequest.mutate({ requestId: id, requesterId: requester_id, accept: true })}
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => respondRequest.mutate({ requestId: id, requesterId: requester_id, accept: false })}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Party Invitations */}
      {tab === 'invites' && (
        invitations.length === 0 ? (
          <EmptyState icon={<Mail size={32} className="text-muted" />} message="No party invitations." />
        ) : (
          <div className="flex flex-col gap-2">
            {invitations.map(({ id, party_id, inviter_profile, created_at }) => (
              <Card key={id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                    {getInitials(inviter_profile?.full_name || inviter_profile?.username || 'P')}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{inviter_profile?.full_name || inviter_profile?.username}</p>
                    <p className="text-xs text-muted">Invited you to their party · {formatDate(created_at)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    loading={respondInvite.isPending}
                    onClick={() => respondInvite.mutate({ invitationId: id, partyId: party_id, accept: true })}
                  >
                    <Check size={14} /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => respondInvite.mutate({ invitationId: id, partyId: party_id, accept: false })}
                  >
                    <X size={14} /> Decline
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Search */}
      {tab === 'search' && (
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length === 0 && searchQuery.length >= 2 && (
            <EmptyState icon={<Search size={32} className="text-muted" />} message="No players found." />
          )}
          {searchResults.map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {getInitials(p.full_name || p.username)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{p.full_name || p.username}</p>
                <p className="text-xs text-muted">@{p.username}</p>
              </div>
              {p.preferred_position && (
                <Badge variant="position" position={p.preferred_position as Position}>
                  {p.preferred_position}
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                loading={sendRequest.isPending}
                onClick={() => sendRequest.mutate(p.id)}
              >
                Add
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      {icon}
      <p className="text-muted text-sm">{message}</p>
    </div>
  )
}
