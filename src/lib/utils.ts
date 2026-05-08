import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const POSITIONS = ['GK', 'ST', 'LW', 'RW', 'CM', 'LB', 'RB'] as const
export type Position = typeof POSITIONS[number]

export const POSITION_COLORS: Record<Position, string> = {
  GK: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ST: 'bg-red-500/20 text-red-400 border-red-500/30',
  LW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  RW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CM: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  LB: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  RB: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
