import { getInitials } from '@/lib/utils'
import type { PartyMember, Position } from '@/types'

const PITCH_POSITIONS: { position: Position; top: number; left: number }[] = [
  { position: 'ST', top: 16, left: 50 },
  { position: 'LW', top: 33, left: 16 },
  { position: 'RW', top: 33, left: 84 },
  { position: 'CM', top: 50, left: 50 },
  { position: 'LB', top: 67, left: 25 },
  { position: 'RB', top: 67, left: 75 },
  { position: 'GK', top: 84, left: 50 },
]

interface Props {
  members: PartyMember[]
  currentUserId: string
}

export default function MiniPitch({ members, currentUserId }: Props) {
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
      {PITCH_POSITIONS.map(({ position, top, left }) => {
        const occupant = members.find((m) => m.preferred_position === position)
        const isMe = occupant?.user_id === currentUserId

        return (
          <div
            key={position}
            style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
            className="flex flex-col items-center gap-0.5"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${
              isMe
                ? 'bg-green-400 border-white text-white'
                : occupant
                ? 'bg-gray-500 border-gray-300 text-white'
                : 'bg-green-900/60 border-white/30 text-white/50'
            }`}>
              {occupant
                ? getInitials(occupant.profile?.full_name || occupant.profile?.username || '?')
                : position}
            </div>
            {occupant && (
              <span className="text-[8px] text-white/70 font-medium">{position}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
