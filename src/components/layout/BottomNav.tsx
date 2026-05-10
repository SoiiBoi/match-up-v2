import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, Shield, History, Tent } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFriendRequests, usePartyInvitations } from '@/hooks/useFriends'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/friends', icon: Users, label: 'Friends' },
  { path: '/lobby', icon: Tent, label: 'Lobby' },
  { path: '/matches', icon: History, label: 'Matches' },
  { path: '/profile', icon: Shield, label: 'Profile' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const { data: requests = [] } = useFriendRequests()
  const { data: invitations = [] } = usePartyInvitations()
  const notifCount = requests.length + invitations.length

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = pathname === path
          const isFriends = path === '/friends'
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors',
                active ? 'text-primary' : 'text-muted hover:text-white'
              )}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                {isFriends && notifCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:block">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
