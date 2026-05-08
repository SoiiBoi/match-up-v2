import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Position = 'GK' | 'ST' | 'LW' | 'RW' | 'CM' | 'LB' | 'RB'

const POSITION_ORDER: Position[] = ['GK', 'ST', 'LW', 'RW', 'CM', 'LB', 'RB']

const POSITION_PRIORITY: Record<Position, Position[]> = {
  GK: ['GK'],
  ST: ['ST', 'CM', 'RW', 'LW'],
  LW: ['LW', 'ST', 'LB', 'CM'],
  RW: ['RW', 'ST', 'RB', 'CM'],
  CM: ['CM', 'ST', 'LW', 'RW', 'LB', 'RB'],
  LB: ['LB', 'RB', 'CM'],
  RB: ['RB', 'LB', 'CM'],
}

interface QueueEntry {
  id: string
  user_id: string
  preferred_position: Position
  any_role: boolean
  party_id: string | null
}

function findBestMatch(available: QueueEntry[], targetPosition: Position): QueueEntry | null {
  const priority = POSITION_PRIORITY[targetPosition]
  for (const pos of priority) {
    const match = available.find((u) => u.preferred_position === pos)
    if (match) return match
  }
  return available.find((u) => u.any_role) ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { action = 'process_queue' } = await req.json().catch(() => ({}))

    const results: string[] = []

    if (action === 'process_queue' || action === 'create_teams') {
      const { data: queue } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true })

      const waiting: QueueEntry[] = queue ?? []
      let teamsCreated = 0

      while (waiting.length >= 7 && teamsCreated < 10) {
        // Try to keep party members together — group by party_id first
        const partyGroups = new Map<string, QueueEntry[]>()
        const solos: QueueEntry[] = []
        for (const entry of waiting) {
          if (entry.party_id) {
            const g = partyGroups.get(entry.party_id) ?? []
            g.push(entry)
            partyGroups.set(entry.party_id, g)
          } else {
            solos.push(entry)
          }
        }

        // Pick players for this team
        const pool: QueueEntry[] = [...solos]
        for (const group of partyGroups.values()) pool.unshift(...group)

        const teamPlayers: { user_id: string; position: Position }[] = []
        const used = new Set<string>()

        for (const pos of POSITION_ORDER) {
          const available = pool.filter((p) => !used.has(p.user_id))
          const match = findBestMatch(available, pos)
          if (!match) break
          teamPlayers.push({ user_id: match.user_id, position: pos })
          used.add(match.user_id)
        }

        if (teamPlayers.length < 7) break

        // Create team
        const { data: team, error: te } = await supabase
          .from('teams')
          .insert({ status: 'forming' })
          .select()
          .single()
        if (te) throw te

        // Insert team members
        await supabase.from('team_members').insert(
          teamPlayers.map(({ user_id, position }) => ({
            team_id: team.id,
            user_id,
            assigned_position: position,
          }))
        )

        // Mark queue entries as matched
        await supabase
          .from('matchmaking_queue')
          .update({ status: 'matched' })
          .in('user_id', teamPlayers.map((p) => p.user_id))

        // Update team status to ready
        await supabase.from('teams').update({ status: 'ready' }).eq('id', team.id)

        // Remove used entries from local pool
        for (const { user_id } of teamPlayers) {
          const idx = waiting.findIndex((e) => e.user_id === user_id)
          if (idx !== -1) waiting.splice(idx, 1)
        }

        teamsCreated++
        results.push(`Team created: ${team.id}`)
      }
    }

    if (action === 'process_queue' || action === 'create_matches') {
      const { data: readyTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('status', 'ready')
        .is('match_id', null)
        .limit(10)

      const teams = readyTeams ?? []
      let matchesCreated = 0

      while (teams.length >= 2 && matchesCreated < 5) {
        const [teamA, teamB] = teams.splice(0, 2)
        const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

        const { data: match, error: me } = await supabase
          .from('matches')
          .insert({
            team_a_id: teamA.id,
            team_b_id: teamB.id,
            status: 'scheduled',
            venue: 'Football Arena Bangkok',
            scheduled_at: scheduledAt,
          })
          .select()
          .single()
        if (me) throw me

        await supabase
          .from('teams')
          .update({ status: 'in_match', match_id: match.id })
          .in('id', [teamA.id, teamB.id])

        matchesCreated++
        results.push(`Match created: ${match.id}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: results.join(', ') || 'Nothing to process', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
