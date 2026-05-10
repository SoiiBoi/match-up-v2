import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Position = 'GK' | 'LB' | 'CB' | 'RB' | 'LM' | 'CM' | 'RM' | 'LW' | 'RW' | 'ST'
type PositionRole = 'goalkeeper' | 'defender' | 'midfielder' | 'attacker'

const POSITION_ROLE: Record<Position, PositionRole> = {
  GK: 'goalkeeper',
  LB: 'defender', CB: 'defender', RB: 'defender',
  LM: 'midfielder', CM: 'midfielder', RM: 'midfielder',
  LW: 'attacker', RW: 'attacker', ST: 'attacker',
}

const POSITION_PRIORITY: Record<Position, Position[]> = {
  GK: ['GK'],
  LB: ['LB', 'CB', 'RB', 'LM'], CB: ['CB', 'LB', 'RB'], RB: ['RB', 'CB', 'LB', 'RM'],
  LM: ['LM', 'CM', 'RM', 'LB', 'LW'], CM: ['CM', 'LM', 'RM', 'ST', 'LW', 'RW'], RM: ['RM', 'CM', 'LM', 'RB', 'RW'],
  LW: ['LW', 'ST', 'LM', 'CM'], RW: ['RW', 'ST', 'RM', 'CM'], ST: ['ST', 'LW', 'RW', 'CM'],
}

// Role constraints per team
const ROLE_MIN: Record<PositionRole, number> = { goalkeeper: 1, defender: 1, midfielder: 1, attacker: 1 }
const ROLE_MAX: Record<PositionRole, number> = { goalkeeper: 1, defender: 3, midfielder: 3, attacker: 3 }

interface QueueEntry {
  id: string
  user_id: string
  preferred_position: Position
  any_role: boolean
  party_id: string | null
}

type RoleCounts = Record<PositionRole, number>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countRoles(players: QueueEntry[]): RoleCounts {
  const c: RoleCounts = { goalkeeper: 0, defender: 0, midfielder: 0, attacker: 0 }
  for (const p of players) c[POSITION_ROLE[p.preferred_position]]++
  return c
}

function addRoles(base: RoleCounts, add: RoleCounts): RoleCounts {
  return {
    goalkeeper: base.goalkeeper + add.goalkeeper,
    defender:   base.defender  + add.defender,
    midfielder: base.midfielder + add.midfielder,
    attacker:   base.attacker  + add.attacker,
  }
}

function isValidTeam(c: RoleCounts): boolean {
  const total = c.goalkeeper + c.defender + c.midfielder + c.attacker
  return (
    total === 7 &&
    c.goalkeeper >= ROLE_MIN.goalkeeper && c.goalkeeper <= ROLE_MAX.goalkeeper &&
    c.defender   >= ROLE_MIN.defender   && c.defender   <= ROLE_MAX.defender   &&
    c.midfielder >= ROLE_MIN.midfielder && c.midfielder <= ROLE_MAX.midfielder &&
    c.attacker   >= ROLE_MIN.attacker   && c.attacker   <= ROLE_MAX.attacker
  )
}

function wouldExceedMax(current: RoleCounts, adding: RoleCounts, teamSize: number, groupSize: number): boolean {
  if (teamSize + groupSize > 7) return true
  const merged = addRoles(current, adding)
  for (const role of Object.keys(ROLE_MAX) as PositionRole[]) {
    if (merged[role] > ROLE_MAX[role]) return true
  }
  return false
}

// Find the best position to assign to an "any_role" player given current role counts
function bestPositionForAnyRole(counts: RoleCounts): Position {
  const roles: PositionRole[] = ['defender', 'midfielder', 'attacker']
  const neediest = roles.sort((a, b) => counts[a] - counts[b])[0]
  const map: Record<PositionRole, Position> = { goalkeeper: 'GK', defender: 'CB', midfielder: 'CM', attacker: 'ST' }
  return map[neediest]
}

// ─── Team Building ────────────────────────────────────────────────────────────

function tryBuildTeam(pool: QueueEntry[]): { players: QueueEntry[]; assignments: { user_id: string; position: Position }[] } | null {
  if (pool.length < 7) return null

  // Check minimum availability
  const avail = countRoles(pool)
  if (avail.goalkeeper < 1 || avail.defender < 1 || avail.midfielder < 1 || avail.attacker < 1) {
    // allow if there are any_role players to fill gaps
    const anyRoleCount = pool.filter(p => p.any_role).length
    if (avail.goalkeeper < 1 && anyRoleCount < 1) return null
    const nonGKRolesWithZero = (['defender', 'midfielder', 'attacker'] as PositionRole[])
      .filter(r => avail[r] === 0)
    if (nonGKRolesWithZero.length > anyRoleCount) return null
  }

  // Separate parties and solos
  const partyMap = new Map<string, QueueEntry[]>()
  const solos: QueueEntry[] = []
  for (const e of pool) {
    if (e.party_id) {
      const g = partyMap.get(e.party_id) ?? []
      g.push(e)
      partyMap.set(e.party_id, g)
    } else {
      solos.push(e)
    }
  }

  const allParties = [...partyMap.values()]

  // Priority order:
  // 1. Parties containing a GK (oldest member first)
  // 2. Solo GK players
  // 3. Other parties (largest first to fill more slots early)
  // 4. Other solos
  const partiesWithGK = allParties.filter(p => p.some(m => m.preferred_position === 'GK'))
  const partiesWithoutGK = allParties.filter(p => !p.some(m => m.preferred_position === 'GK'))
    .sort((a, b) => b.length - a.length)
  const soloGK = solos.filter(s => s.preferred_position === 'GK')
  const otherSolos = solos.filter(s => s.preferred_position !== 'GK')

  // Flatten to a list of "candidate groups" (party = array, solo = single-element array)
  const candidateGroups: QueueEntry[][] = [
    ...partiesWithGK,
    ...soloGK.map(s => [s]),
    ...partiesWithoutGK,
    ...otherSolos.map(s => [s]),
  ]

  const team: QueueEntry[] = []
  const roleCounts: RoleCounts = { goalkeeper: 0, defender: 0, midfielder: 0, attacker: 0 }
  const usedIds = new Set<string>()

  for (const group of candidateGroups) {
    if (team.length >= 7) break
    if (group.some(p => usedIds.has(p.user_id))) continue

    const groupRoles = countRoles(group)
    if (wouldExceedMax(roleCounts, groupRoles, team.length, group.length)) continue

    for (const p of group) {
      team.push(p)
      usedIds.add(p.user_id)
      roleCounts[POSITION_ROLE[p.preferred_position]]++
    }
  }

  if (team.length !== 7) return null
  if (!isValidTeam(roleCounts)) return null

  // Build position assignments
  const takenPositions = new Set<Position>()
  const assignments: { user_id: string; position: Position }[] = []

  for (const player of team) {
    if (player.any_role) {
      // Assign to a position based on what the team still needs
      const currentCounts = countRoles(assignments.map(a => ({ ...player, preferred_position: a.position })))
      const pos = bestPositionForAnyRole(currentCounts)
      assignments.push({ user_id: player.user_id, position: pos })
      takenPositions.add(pos)
    } else {
      // Try preferred position first, then priority fallbacks
      const prios = POSITION_PRIORITY[player.preferred_position]
      const pos = prios.find(p => !takenPositions.has(p)) ?? player.preferred_position
      assignments.push({ user_id: player.user_id, position: pos })
      takenPositions.add(pos)
    }
  }

  return { players: team, assignments }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const action: string = body.action ?? 'process_queue'
    const results: string[] = []

    // ── Phase 1: Create Teams ──────────────────────────────────────────────────
    if (action === 'process_queue' || action === 'create_teams') {
      const { data: queue } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true })

      let pool: QueueEntry[] = (queue ?? []) as QueueEntry[]
      let teamsCreated = 0

      while (pool.length >= 7 && teamsCreated < 10) {
        const result = tryBuildTeam(pool)
        if (!result) break

        const { players, assignments } = result

        // Create team record
        const { data: team, error: te } = await supabase
          .from('teams')
          .insert({ status: 'ready' })
          .select()
          .single()
        if (te) throw te

        // Insert team members with assigned positions
        const { error: tme } = await supabase.from('team_members').insert(
          assignments.map(({ user_id, position }) => ({
            team_id: team.id,
            user_id,
            assigned_position: position,
          }))
        )
        if (tme) throw tme

        // Mark queue entries as matched
        const { error: qe } = await supabase
          .from('matchmaking_queue')
          .update({ status: 'matched' })
          .in('user_id', players.map(p => p.user_id))
        if (qe) throw qe

        // Remove used players from pool
        const usedIds = new Set(players.map(p => p.user_id))
        pool = pool.filter(p => !usedIds.has(p.user_id))

        teamsCreated++
        results.push(`Team created: ${team.id} (${assignments.map(a => a.position).join(', ')})`)
      }
    }

    // ── Phase 2: Create Games (round-robin with 4 teams) ──────────────────────
    if (action === 'process_queue' || action === 'create_games') {
      const { data: readyTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('status', 'ready')
        .is('game_id', null)
        .order('created_at', { ascending: true })
        .limit(40)

      let teams = (readyTeams ?? []).map(t => t.id)
      let gamesCreated = 0

      while (teams.length >= 4 && gamesCreated < 5) {
        const gameFour = teams.splice(0, 4)

        // Create the game record
        const { data: game, error: ge } = await supabase
          .from('games')
          .insert({ status: 'active' })
          .select()
          .single()
        if (ge) throw ge

        // Generate all 6 pairs from 4 teams: C(4,2)
        const pairs: [string, string][] = []
        for (let i = 0; i < gameFour.length; i++) {
          for (let j = i + 1; j < gameFour.length; j++) {
            pairs.push([gameFour[i], gameFour[j]])
          }
        }

        // Schedule matches 30 minutes apart starting in 2 hours
        const now = Date.now()
        const twoHours = 2 * 60 * 60 * 1000
        const thirtyMin = 30 * 60 * 1000

        const matchInserts = pairs.map(([teamA, teamB], idx) => ({
          team_a_id: teamA,
          team_b_id: teamB,
          game_id: game.id,
          status: 'scheduled',
          venue: 'Football Arena Bangkok',
          scheduled_at: new Date(now + twoHours + idx * thirtyMin).toISOString(),
        }))

        const { error: me } = await supabase.from('matches').insert(matchInserts)
        if (me) throw me

        // Update all 4 teams: in_game + game_id
        const { error: tue } = await supabase
          .from('teams')
          .update({ status: 'in_game', game_id: game.id })
          .in('id', gameFour)
        if (tue) throw tue

        gamesCreated++
        results.push(`Game created: ${game.id} with 6 matches`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: results.join(' | ') || 'Nothing to process', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
