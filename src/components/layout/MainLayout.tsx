import type { ReactNode } from 'react'
import BottomNav from './BottomNav'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
