import { X } from 'lucide-react'
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
  partyId: string
  onSelect: (pos: Position | null) => void
  onClose: () => void
  selecting: boolean
}

export default function PositionPitchOverlay({ members, currentUserId, onSelect, onClose, selecting }: Props) {
  const myMember = members.find((m) => m.user_id === currentUserId)
  const myPosition = myMember?.preferred_position ?? null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe py-3 border-b border-white/10 flex-shrink-0">
        <h2 className="text-white font-bold text-lg">Choose Position</h2>
        <button onClick={onClose} className="text-muted hover:text-white transition-colors p-2 -mr-2">
          <X size={22} />
        </button>
      </div>

      <p className="text-center text-xs text-muted pt-2 flex-shrink-0">
        {myPosition ? `Current: ${myPosition} — tap it again to deselect` : 'Tap a free position to claim it'}
      </p>

      {/* Pitch */}
      <div className="flex-1 flex items-center justify-center px-6 py-3 min-h-0">
        <div
          className="relative w-full rounded-2xl overflow-hidden border-2 border-white/20"
          style={{ maxWidth: '280px', aspectRatio: '9/16', background: 'linear-gradient(180deg, #15803d 0%, #16a34a 50%, #15803d 100%)' }}
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
            style={{ width: '90px', height: '90px' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/60" />

          {/* Own goal box (bottom) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-2 border-white/40 border-b-0 rounded-t-lg"
            style={{ width: '38%', height: '8%' }} />

          {/* Corner flags */}
          {[['top-0 left-0', 'rounded-br-full'], ['top-0 right-0', 'rounded-bl-full'],
            ['bottom-0 left-0', 'rounded-tr-full'], ['bottom-0 right-0', 'rounded-tl-full']].map(([pos, r], i) => (
            <div key={i} className={`absolute ${pos} w-4 h-4 border-2 border-white/30 ${r}`} />
          ))}

          {/* Position circles */}
          {PITCH_POSITIONS.map(({ position, top, left }) => {
            const occupant = members.find((m) => m.preferred_position === position)
            const isMe = occupant?.user_id === currentUserId
            const isLocked = !!occupant && !isMe
            const displayName = occupant
              ? (occupant.profile?.full_name || occupant.profile?.username || '?')
              : null

            return (
              <button
                key={position}
                disabled={isLocked || selecting}
                onClick={() => !isLocked && onSelect(isMe ? null : position)}
                style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }}
                className="flex flex-col items-center gap-0.5"
              >
                {/* Circle */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isMe
                    ? 'bg-green-400 border-white text-white shadow-lg shadow-green-400/50 scale-110'
                    : isLocked
                    ? 'bg-gray-600/80 border-gray-400/50 text-gray-300 cursor-not-allowed'
                    : 'bg-green-900/70 border-white/60 text-white hover:bg-green-500 hover:border-white hover:scale-110 active:scale-95 cursor-pointer'
                }`}>
                  {occupant
                    ? getInitials(displayName || '?')
                    : position}
                </div>

                {/* Label below circle */}
                <span className={`text-[9px] font-semibold px-1 py-0.5 rounded whitespace-nowrap max-w-[52px] truncate ${
                  isMe
                    ? 'text-green-300'
                    : isLocked
                    ? 'text-gray-400'
                    : 'text-white/60'
                }`}>
                  {isMe ? 'You' : isLocked ? displayName!.split(' ')[0] : position}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-5 pb-6 flex-shrink-0">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> You
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="w-3 h-3 rounded-full bg-gray-600 inline-block" /> Taken
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="w-3 h-3 rounded-full bg-green-900 border border-white/40 inline-block" /> Free
        </span>
      </div>
    </div>
  )
}
