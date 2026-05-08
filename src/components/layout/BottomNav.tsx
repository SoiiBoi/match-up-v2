import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, Shield, History, Tent } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors',
                active ? 'text-primary' : 'text-muted hover:text-white'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="hidden sm:block">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
