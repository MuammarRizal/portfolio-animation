// Friendly villagers that roam the realm. They are decorative NPCs — never
// huntable — and expose a live registry so the radar can plot them. Each one
// renders a real rigged GLB (src/game/models.ts).
import type { Vector3 } from 'three'
import type { ModelKey } from './models'
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

export interface VillagerDef {
  id: string
  name: string
  role: string
  /** Home point the villager drifts around. */
  home: [number, number]
  /** Max wander distance from home. */
  wander: number
  /** Which rigged GLB to render for this villager. */
  model: ModelKey
  /** Radar dot colour. */
  accent: string
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

export const HIJAU_VILLAGERS: VillagerDef[] = [
  {
    id: 'npc-bijak',
    name: 'Pak Bijak',
    role: 'Penjaga Alun-Alun',
    home: homeAt(null, 4.5, 6.5),
    wander: 4,
    model: 'knight',
    accent: '#22d3ee',
  },
  {
    id: 'npc-dharma',
    name: 'Bu Dharma',
    role: 'Pemandu Pemula',
    home: homeAt(null, -5.5, 4.5),
    wander: 3.5,
    model: 'rogue',
    accent: '#f472b6',
  },
  {
    id: 'npc-arca',
    name: 'Sang Arca',
    role: 'Juru Bahasa Kuno',
    home: homeAt('about', 5, -6),
    wander: 4,
    model: 'mage',
    accent: '#60a5fa',
  },
  {
    id: 'npc-ava',
    name: 'Teknisi Ava',
    role: 'Perakit Mesin',
    home: homeAt('projects', -5, -5),
    wander: 4,
    model: 'rogueHooded',
    accent: '#c084fc',
  },
  {
    id: 'npc-biner',
    name: 'Kurir Biner',
    role: 'Pengantar Paket Data',
    home: homeAt('projects', 6, 5),
    wander: 5,
    model: 'rogue',
    accent: '#fcd34d',
  },
  {
    id: 'npc-sage',
    name: 'Nexus Sage',
    role: 'Penjaga Pengetahuan',
    home: homeAt('skills', 4, 6),
    wander: 4,
    model: 'mage',
    accent: '#34d399',
  },
  {
    id: 'npc-api',
    name: 'Penjaga Api',
    role: 'Penjaga Mercusuar',
    home: homeAt('contact', -4, 6),
    wander: 4,
    model: 'barbarian',
    accent: '#fb923c',
  },
  {
    id: 'npc-rimba',
    name: 'Anak Rimba',
    role: 'Penjelajah Cilik',
    home: homeAt(null, 0, 9),
    wander: 6,
    model: 'rogueHooded',
    accent: '#a3e635',
  },
]

/** Villagers grouped by island; the registry stays flat for the radar. */
export const ISLAND_VILLAGERS: Record<string, VillagerDef[]> = {
  hijau: HIJAU_VILLAGERS,
}

/** Every villager across every island (the HUD counts these). */
export const VILLAGERS: VillagerDef[] = Object.values(ISLAND_VILLAGERS).flat()
