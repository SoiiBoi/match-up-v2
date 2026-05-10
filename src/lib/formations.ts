import type { Formation, Position } from '@/types'

export interface FormationDef {
  id: Formation
  label: string
  shape: string
  style: string
  positions: Position[]
  coords: Partial<Record<Position, { top: number; left: number }>>
}

const GK_COORD = { top: 84, left: 50 }

export const FORMATIONS: FormationDef[] = [
  {
    id: 'defensive',
    label: '1-3-2-1',
    shape: '3-2-1',
    style: 'Defensive',
    positions: ['GK', 'LB', 'CB', 'RB', 'LM', 'RM', 'ST'],
    coords: {
      GK: GK_COORD,
      LB: { top: 67, left: 20 },
      CB: { top: 67, left: 50 },
      RB: { top: 67, left: 80 },
      LM: { top: 45, left: 30 },
      RM: { top: 45, left: 70 },
      ST: { top: 16, left: 50 },
    },
  },
  {
    id: 'counter',
    label: '1-2-3-1',
    shape: '2-3-1',
    style: 'Counter-attack',
    positions: ['GK', 'LB', 'RB', 'LM', 'CM', 'RM', 'ST'],
    coords: {
      GK: GK_COORD,
      LB: { top: 67, left: 25 },
      RB: { top: 67, left: 75 },
      LM: { top: 48, left: 20 },
      CM: { top: 48, left: 50 },
      RM: { top: 48, left: 80 },
      ST: { top: 16, left: 50 },
    },
  },
  {
    id: 'balanced',
    label: '1-2-2-2',
    shape: '2-2-2',
    style: 'Balanced (popular)',
    positions: ['GK', 'LB', 'RB', 'LM', 'RM', 'LW', 'RW'],
    coords: {
      GK: GK_COORD,
      LB: { top: 67, left: 25 },
      RB: { top: 67, left: 75 },
      LM: { top: 50, left: 30 },
      RM: { top: 50, left: 70 },
      LW: { top: 25, left: 20 },
      RW: { top: 25, left: 80 },
    },
  },
  {
    id: 'most-balanced',
    label: '1-3-1-2',
    shape: '3-1-2',
    style: 'Most balanced',
    positions: ['GK', 'LB', 'CB', 'RB', 'CM', 'LW', 'RW'],
    coords: {
      GK: GK_COORD,
      LB: { top: 67, left: 20 },
      CB: { top: 67, left: 50 },
      RB: { top: 67, left: 80 },
      CM: { top: 50, left: 50 },
      LW: { top: 25, left: 25 },
      RW: { top: 25, left: 75 },
    },
  },
  {
    id: 'attacking',
    label: '1-2-1-3',
    shape: '2-1-3',
    style: 'Attacking',
    positions: ['GK', 'LB', 'RB', 'CM', 'LW', 'ST', 'RW'],
    coords: {
      GK: GK_COORD,
      LB: { top: 67, left: 25 },
      RB: { top: 67, left: 75 },
      CM: { top: 50, left: 50 },
      LW: { top: 25, left: 20 },
      ST: { top: 16, left: 50 },
      RW: { top: 25, left: 80 },
    },
  },
  {
    id: 'mid-heavy',
    label: '1-1-3-2',
    shape: '1-3-2',
    style: 'Midfield-heavy',
    positions: ['GK', 'CB', 'LM', 'CM', 'RM', 'LW', 'RW'],
    coords: {
      GK: GK_COORD,
      CB: { top: 67, left: 50 },
      LM: { top: 50, left: 20 },
      CM: { top: 50, left: 50 },
      RM: { top: 50, left: 80 },
      LW: { top: 25, left: 25 },
      RW: { top: 25, left: 75 },
    },
  },
  {
    id: 'very-attacking',
    label: '1-1-2-3',
    shape: '1-2-3',
    style: 'Very attacking',
    positions: ['GK', 'CB', 'LM', 'RM', 'LW', 'ST', 'RW'],
    coords: {
      GK: GK_COORD,
      CB: { top: 67, left: 50 },
      LM: { top: 50, left: 30 },
      RM: { top: 50, left: 70 },
      LW: { top: 25, left: 20 },
      ST: { top: 16, left: 50 },
      RW: { top: 25, left: 80 },
    },
  },
]

export const FORMATION_MAP = Object.fromEntries(
  FORMATIONS.map((f) => [f.id, f])
) as Record<Formation, FormationDef>

export function getFormation(id: Formation): FormationDef {
  return FORMATION_MAP[id]
}
