export type Position = 'GK' | 'ST' | 'LW' | 'RW' | 'CM' | 'LB' | 'RB'

export interface Profile {
  id: string
  username: string
  full_name: string | null
  age: number | null
  nationality: string | null
  height_cm: number | null
  weight_kg: number | null
  preferred_position: Position | null
  games_played: number
  goals: number
  assists: number
  wins: number
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: 'admin' | 'moderator'
  created_at: string
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  created_at: string
  profile?: Profile
}

export interface FriendRequest {
  id: string
  requester_id: string
  requested_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  requester_profile?: Profile
  requested_profile?: Profile
}

export interface Party {
  id: string
  leader_id: string
  status: 'active' | 'in_queue' | 'disbanded'
  created_at: string
  updated_at: string
}

export interface PartyMember {
  id: string
  party_id: string
  user_id: string
  preferred_position: Position | null
  status: 'ready' | 'not_ready'
  joined_at: string
  profile?: Profile
}

export interface PartyInvitation {
  id: string
  party_id: string
  inviter_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  created_at: string
  updated_at: string
  inviter_profile?: Profile
  party?: Party
}

export interface QueueEntry {
  id: string
  user_id: string
  preferred_position: Position
  any_role: boolean
  skill_level: number
  party_id: string | null
  status: 'waiting' | 'matched' | 'cancelled'
  joined_at: string
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  status: 'forming' | 'ready' | 'in_match' | 'disbanded'
  match_id: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  assigned_position: Position
  joined_at: string
  profile?: Profile
}

export interface Match {
  id: string
  team_a_id: string
  team_b_id: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  venue: string
  scheduled_at: string
  created_at: string
  updated_at: string
  team_a?: TeamWithMembers
  team_b?: TeamWithMembers
  result?: MatchResult
}

export interface TeamWithMembers extends Team {
  members: TeamMember[]
}

export interface MatchResult {
  id: string
  match_id: string
  team_a_score: number
  team_b_score: number
  recorded_at: string
  recorded_by: string
}

export const POSITION_PRIORITY: Record<Position, Position[]> = {
  GK: ['GK'],
  ST: ['ST', 'CM', 'RW', 'LW'],
  LW: ['LW', 'ST', 'LB', 'CM'],
  RW: ['RW', 'ST', 'RB', 'CM'],
  CM: ['CM', 'ST', 'LW', 'RW', 'LB', 'RB'],
  LB: ['LB', 'RB', 'CM'],
  RB: ['RB', 'LB', 'CM'],
}

export const ALL_POSITIONS: Position[] = ['GK', 'ST', 'LW', 'RW', 'CM', 'LB', 'RB']
