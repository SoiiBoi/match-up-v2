import { getInitials, ROLE_COLORS } from '@/lib/utils'
import { getFormation } from '@/lib/formations'
import type { PartyMember, Position, Formation } from '@/types'
import { POSITION_ROLE } from '@/types'

interface Props {
  members: PartyMember[]
  currentUserId: string
  formation: Formation
  onSelect: (pos: Position | null) => void
  selecting: boolean
}

export default function InlinePitch({ members, currentUserId, formation, onSelect, selecting }: Props) {
  const myMember = members.find((m) => m.user_id === currentUserId)
  const myPosition = myMember?.preferred_position ?? null
  const formationDef = getFormation(formation)
  const pitchPositions = formationDef.positions.map((pos) => ({
    position: pos,
    ...formationDef.coords[pos]!,
  }))

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border-2 border-white/20 mx-auto"
      style={{
        maxWidth: '260px',
        aspectRatio: '9/16',
        background: 'linear-gradient(180deg, #15803d 0%, #16a34a 50%, #15803d 100%)',
      }}
    >
      {/* Pitch stripes */}
      {[0,1,2,3,4,5].map((i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{ top: `${i * 16.67}%`, height: '16.67%', background: i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'transparent' }}
        />
      ))}

      {/* Opponent goal box (top) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 border-2 border-white/40 border-t-0 rounded-b-lg"
        style={{ width: '38%', height: '8%' }} />

      {/* Center line */}
      <div className="absolute top-1/2 left-[5%] right-[5%] h-px bg-white/40" />

      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40"
        style={{ width: '80px', height: '80px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />

      {/* Own goal box (bottom) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-2 border-white/40 border-b-0 rounded-t-lg"
        style={{ width: '38%', height: '8%' }} />

      {/* Corner flags */}
      {[['top-0 left-0', 'rounded-br-full'], ['top-0 right-0', 'rounded-bl-full'],
        ['bottom-0 left-0', 'rounded-tr-full'], ['bottom-0 right-0', 'rounded-tl-full']].map(([pos, r], i) => (
        <div key={i} className={`absolute ${pos} w-3 h-3 border-2 border-white/30 ${r}`} />
      ))}

      {/* Position circles */}
      {pitchPositions.map(({ position, top, left }) => {
        const occupant = members.find((m) => m.preferred_position === position)
        const isMe = occupant?.user_id === currentUserId
        const isLocked = !!occupant && !isMe
        const displayName = occupant
          ? (occupant.profile?.full_name || occupant.profile?.username || '?')
          : null
        const role = POSITION_ROLE[position]
        const rc = ROLE_COLORS[role]

        return (
          <button
            key={position}
            disabled={isLocked || selecting}
            onClick={() => !isLocked && onSelect(isMe ? null : position)}
            style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
            className="flex flex-col items-center gap-0.5"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              isMe
                ? `${rc.bright} shadow-lg ${rc.shadow} scale-110`
                : isLocked
                ? `${rc.dark} cursor-not-allowed`
                : `bg-green-900/70 border-white/60 text-white ${rc.hover} hover:scale-110 active:scale-95 cursor-pointer`
            }`}>
              {occupant ? getInitials(displayName || '?') : position}
            </div>
            <span className={`text-[9px] font-semibold px-1 rounded whitespace-nowrap max-w-[48px] truncate ${
              isMe ? rc.label : isLocked ? `${rc.label} opacity-70` : 'text-white/60'
            }`}>
              {isMe ? 'You' : isLocked ? displayName!.split(' ')[0] : position}
            </span>
          </button>
        )
      })}

      {/* Formation label overlay */}
      <div className="absolute bottom-1 right-1.5 text-[9px] text-white/40 font-mono">
        {formationDef.label}
      </div>

      {/* "Tap to pick" hint if user has no position */}
      {!myPosition && (
        <div className="absolute top-1 left-0 right-0 flex justify-center">
          <span className="text-[9px] text-yellow-300/80 bg-black/30 px-2 py-0.5 rounded-full">
            Tap a position to claim it
          </span>
        </div>
      )}
    </div>
  )
}
