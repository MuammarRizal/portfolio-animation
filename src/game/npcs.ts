// Friendly human villagers that roam the realm. They are decorative NPCs —
// never huntable — and expose a live registry so the radar can plot them.
import type { Vector3 } from 'three'
import { ZONES } from '../data/portfolio'

export interface NpcEntry {
  id: string
  name: string
  color: string
  /** Live XZ position — mutated each frame. y is ignored. */
  pos: Vector3
}

/** Shared registry so the minimap reads the same villagers that are rendered. */
export const npcRegistry = new Map<string, NpcEntry>()

export type NpcHairStyle = 'short' | 'spiky' | 'long' | 'bun'

export interface VillagerDef {
  id: string
  name: string
  role: string
  /** Home point the villager drifts around. */
  home: [number, number]
  /** Max wander distance from home. */
  wander: number
  skin: string
  hair: string
  hairStyle: NpcHairStyle
  top: string
  accent: string
  pants: string
}

/** World position of a realm outpost. */
function zonePos(zoneId: string): [number, number] {
  const zone = ZONES.find((z) => z.id === zoneId)
  if (!zone) return [0, 0]
  return [zone.position[0], zone.position[2]]
}

/** Home point offset from a zone centre (or from spawn when zoneId is null). */
function homeAt(zoneId: string | null, dx: number, dz: number): [number, number] {
  if (!zoneId) return [dx, dz]
  const [x, z] = zonePos(zoneId)
  return [x + dx, z + dz]
}

export const VILLAGERS: VillagerDef[] = [
  {
    id: 'npc-bijak',
    name: 'Pak Bijak',
    role: 'Penjaga Alun-Alun',
    home: homeAt(null, 4.5, 6.5),
    wander: 4,
    skin: '#e0b089',
    hair: '#d1d5db',
    hairStyle: 'short',
    top: '#0e7490',
    accent: '#22d3ee',
    pants: '#334155',
  },
  {
    id: 'npc-dharma',
    name: 'Bu Dharma',
    role: 'Pemandu Pemula',
    home: homeAt(null, -5.5, 4.5),
    wander: 3.5,
    skin: '#f0c69f',
    hair: '#4c1d95',
    hairStyle: 'long',
    top: '#be185d',
    accent: '#f472b6',
    pants: '#831843',
  },
  {
    id: 'npc-arca',
    name: 'Sang Arca',
    role: 'Juru Bahasa Kuno',
    home: homeAt('about', 5, -6),
    wander: 4,
    skin: '#dbab7f',
    hair: '#78350f',
    hairStyle: 'bun',
    top: '#1d4ed8',
    accent: '#60a5fa',
    pants: '#1e3a8a',
  },
  {
    id: 'npc-ava',
    name: 'Teknisi Ava',
    role: 'Perakit Mesin',
    home: homeAt('projects', -5, -5),
    wander: 4,
    skin: '#f2c39b',
    hair: '#dc2626',
    hairStyle: 'spiky',
    top: '#7c3aed',
    accent: '#c084fc',
    pants: '#4c1d95',
  },
  {
    id: 'npc-biner',
    name: 'Kurir Biner',
    role: 'Pengantar Paket Data',
    home: homeAt('projects', 6, 5),
    wander: 5,
    skin: '#c98a5b',
    hair: '#111827',
    hairStyle: 'short',
    top: '#f59e0b',
    accent: '#fcd34d',
    pants: '#78350f',
  },
  {
    id: 'npc-sage',
    name: 'Nexus Sage',
    role: 'Penjaga Pengetahuan',
    home: homeAt('skills', 4, 6),
    wander: 4,
    skin: '#e8b48a',
    hair: '#e2e8f0',
    hairStyle: 'long',
    top: '#047857',
    accent: '#34d399',
    pants: '#064e3b',
  },
  {
    id: 'npc-api',
    name: 'Penjaga Api',
    role: 'Penjaga Mercusuar',
    home: homeAt('contact', -4, 6),
    wander: 4,
    skin: '#d9a06b',
    hair: '#0f172a',
    hairStyle: 'short',
    top: '#b91c1c',
    accent: '#fb923c',
    pants: '#7f1d1d',
  },
  {
    id: 'npc-rimba',
    name: 'Anak Rimba',
    role: 'Penjelajah Cilik',
    home: homeAt(null, 0, 9),
    wander: 6,
    skin: '#f0c8a0',
    hair: '#a16207',
    hairStyle: 'spiky',
    top: '#15803d',
    accent: '#a3e635',
    pants: '#14532d',
  },
]
