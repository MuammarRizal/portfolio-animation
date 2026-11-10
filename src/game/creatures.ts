import type { Vector3 } from 'three'

export type CreatureType = 'deer' | 'sheep' | 'rabbit'

export interface CreatureEntry {
  id: string
  type: CreatureType
  alive: boolean
  /** Live XZ position — mutated by the wanderer each frame. y is ignored. */
  pos: Vector3
  hit: () => void
}

/** Shared registry so combat and the radar read the exact same creature set. */
export const creatureRegistry = new Map<string, CreatureEntry>()

/** Closest alive creature within `maxDist` (XZ) of a point, or null. */
export function findNearestCreature(x: number, z: number, maxDist: number): CreatureEntry | null {
  let best: CreatureEntry | null = null
  let bestD = maxDist
  for (const c of creatureRegistry.values()) {
    if (!c.alive) continue
    const d = Math.hypot(c.pos.x - x, c.pos.z - z)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}
