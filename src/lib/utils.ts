import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PositionRole } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const POSITIONS = ['GK', 'LB', 'CB', 'RB', 'LM', 'CM', 'RM', 'LW', 'RW', 'ST'] as const
export type Position = typeof POSITIONS[number]

export const ROLE_COLORS: Record<PositionRole, { bright: string; dark: string; hover: string; shadow: string; label: string }> = {
  goalkeeper: {
    bright: 'bg-yellow-400 border-yellow-200 text-white',
    dark:   'bg-yellow-700 border-yellow-500 text-yellow-100',
    hover:  'hover:bg-yellow-400 hover:border-yellow-300',
    shadow: 'shadow-yellow-400/50',
    label:  'text-yellow-300',
  },
  defender: {
    bright: 'bg-blue-500 border-blue-300 text-white',
    dark:   'bg-blue-800 border-blue-600 text-blue-100',
    hover:  'hover:bg-blue-500 hover:border-blue-300',
    shadow: 'shadow-blue-500/50',
    label:  'text-blue-300',
  },
  midfielder: {
    bright: 'bg-emerald-400 border-emerald-200 text-white',
    dark:   'bg-emerald-700 border-emerald-500 text-emerald-100',
    hover:  'hover:bg-emerald-400 hover:border-emerald-300',
    shadow: 'shadow-emerald-400/50',
    label:  'text-emerald-300',
  },
  attacker: {
    bright: 'bg-red-500 border-red-300 text-white',
    dark:   'bg-red-800 border-red-600 text-red-100',
    hover:  'hover:bg-red-500 hover:border-red-300',
    shadow: 'shadow-red-500/50',
    label:  'text-red-300',
  },
}

export const POSITION_COLORS: Record<Position, string> = {
  GK: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  LB: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CB: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  RB: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  LM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  RM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  LW: 'bg-red-500/20 text-red-400 border-red-500/30',
  RW: 'bg-red-500/20 text-red-400 border-red-500/30',
  ST: 'bg-red-500/20 text-red-400 border-red-500/30',
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
