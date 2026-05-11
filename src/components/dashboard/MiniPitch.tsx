import { getInitials, ROLE_COLORS } from '@/lib/utils'
import { getFormation, POSITION_COORDS } from '@/lib/formations'
import type { PartyMember, Formation, Position } from '@/types'
import { POSITION_ROLE } from '@/types'

interface Props {
  members: PartyMember[]
  currentUserId: string
  formation?: Formation
  customPositions?: Position[]
}

export default function MiniPitch({ members, currentUserId, formation = 'balanced', customPositions }: Props) {
  const formationDef = getFormation(formation)
  const pitchPositions = customPositions
    ? customPositions.map((pos) => ({ position: pos, ...POSITION_COORDS[pos] }))
    : formationDef.positions.map((pos) => ({ position: pos, ...formationDef.coords[pos]! }))
  return (
    <div
      className="relative flex-shrink-0 rounded-xl overflow-hidden border border-white/20"
      style={{
        width: '160px',
        aspectRatio: '9/16',
        background: 'linear-gradient(180deg, #15803d 0%, #16a34a 50%, #15803d 100%)',
      }}
    >
      {/* Pitch stripes */}
      {[0,1,2,3,4,5].map((i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{ top: `${i * 16.67}%`, height: '16.67%', background: i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'transparent' }}
        />
      ))}

      {/* Opponent goal box */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 border border-white/30 border-t-0 rounded-b-md"
        style={{ width: '38%', height: '7%' }} />

      {/* Center line */}
      <div className="absolute top-1/2 left-[6%] right-[6%] h-px bg-white/30" />

      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30"
        style={{ width: '52px', height: '52px' }} />

      {/* Own goal box */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border border-white/30 border-b-0 rounded-t-md"
        style={{ width: '38%', height: '7%' }} />

      {/* Position circles */}
      {pitchPositions.map(({ position, top, left }) => {
        const occupant = members.find((m) => m.preferred_position === position)
        const isMe = occupant?.user_id === currentUserId
        const rc = ROLE_COLORS[POSITION_ROLE[position]]

        return (
          <div
            key={position}
            style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
            className="flex flex-col items-center gap-0.5"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${
              isMe
                ? `${rc.bright} shadow-md`
                : occupant
                ? rc.dark
                : 'bg-green-900/60 border-white/30 text-white/50'
            }`}>
              {occupant
                ? getInitials(occupant.profile?.full_name || occupant.profile?.username || '?')
                : position}
            </div>
            {occupant && (
              <span className={`text-[8px] font-medium ${isMe ? rc.label : `${rc.label} opacity-70`}`}>{position}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
