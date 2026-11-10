// Single source of truth for the game world: terrain height, static colliders,
// deterministic decorations, paths, mountains and the circular boundary.
import type { Vector3 } from 'three'
import { HOUSES, ZONES } from '../data/portfolio'

/** Mutable per-frame player state shared through refs (no React state churn). */
export interface PlayerState {
  position: Vector3
  rotation: number
  sprinting: boolean
  airborne: boolean
}

export interface Collider {
  x: number
  z: number
  r: number
}

export interface Hill {
  x: number
  z: number
  radius: number
  height: number
}

export type DecorationType = 'tree' | 'rock' | 'ruin' | 'lantern'

export interface Decoration {
  type: DecorationType
  x: number
  y: number
  z: number
  scale: number
  rot: number
}

export interface Archway {
  x: number
  z: number
  rot: number
}

// Realm geometry
export const TERRAIN_RADIUS = 66
export const BOUNDARY_RADIUS = 60

// Village house footprint (single shared base size — houses vary via uniform scale).
export const HOUSE_W = 4.2
export const HOUSE_D = 4.8
export const HOUSE_H = 3.2
/** How close the player must be to a house for its mini-zone prompt to appear. */
export const HOUSE_INTERACT_RADIUS = 5.8

// The 4 realm outposts (sourced from ZONES so render + collision stay in sync)
const OUTPOSTS = ZONES.map((z) => ({ x: z.position[0], z: z.position[2], r: 12 }))
// Each house gets its own flattened pad so it never sinks into a hill.
const HOUSE_SPOTS = HOUSES.map((h) => ({ x: h.x, z: h.z, r: 6 }))

const FLAT_SPOTS = [{ x: 0, z: 0, r: 10 }, ...OUTPOSTS, ...HOUSE_SPOTS]

// Rolling hills (walkable, you climb over them)
export const HILLS: Hill[] = [
  { x: -20, z: 8, radius: 15, height: 4.6 },
  { x: 24, z: -8, radius: 13, height: 4.0 },
  { x: 12, z: 28, radius: 15, height: 5.4 },
  { x: -26, z: -12, radius: 12, height: 3.6 },
  { x: 34, z: 22, radius: 13, height: 4.2 },
  { x: -10, z: -36, radius: 13, height: 4.8 },
  { x: 6, z: -18, radius: 10, height: 2.8 },
]

// Tall mountains (solid obstacles + landmarks, cannot be walked through)
export const MOUNTAINS: Hill[] = [
  { x: -48, z: 6, radius: 10, height: 20 },
  { x: 48, z: -44, radius: 11, height: 23 },
  { x: -50, z: -54, radius: 9, height: 17 },
  { x: 52, z: 50, radius: 10, height: 19 },
]

// Ancient roadways: straight segments from the spawn plaza to each outpost
export const PATHS: Array<[number, number, number, number]> = [
  [0, 0, -36, -32],
  [0, 0, 36, -32],
  [0, 0, -36, 36],
  [0, 0, 36, 36],
]

export const ARCHWAYS: Archway[] = [
  { x: -9, z: -8, rot: 0.84 },
  { x: -27, z: -24, rot: 0.84 },
  { x: 9, z: -8, rot: -0.84 },
  { x: 27, z: -24, rot: -0.84 },
  { x: -9, z: 9, rot: -0.9 },
  { x: 9, z: 9, rot: 0.9 },
]

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/** Terrain height at a world position (XZ). Returns Y. */
export function getTerrainHeight(x: number, z: number): number {
  // Gentle rolling base
  let h =
    Math.sin(x * 0.055) * Math.cos(z * 0.05) * 1.15 +
    Math.sin(x * 0.12 + z * 0.1) * 0.5 +
    Math.cos(x * 0.09 - z * 0.13) * 0.4

  // Walkable hills (rounded)
  for (const hill of HILLS) {
    const d = Math.hypot(x - hill.x, z - hill.z)
    if (d < hill.radius) h += hill.height * smoothstep(1 - d / hill.radius)
  }
  // Mountains (peaked cones)
  for (const m of MOUNTAINS) {
    const d = Math.hypot(x - m.x, z - m.z)
    if (d < m.radius) h += m.height * Math.pow(1 - d / m.radius, 1.35)
  }

  // Flatten around spawn plaza and outposts so structures sit on level ground
  for (const s of FLAT_SPOTS) {
    const d = Math.hypot(x - s.x, z - s.z)
    if (d < s.r) {
      const core = s.r * 0.5
      const f = d < core ? 0 : smoothstep((d - core) / core)
      h *= f
    }
  }

  return h
}

/** Distance from a point to the nearest ancient roadway. */
export function distanceToPath(x: number, z: number): number {
  let best = Infinity
  for (const [x1, z1, x2, z2] of PATHS) {
    const dx = x2 - x1
    const dz = z2 - z1
    const len2 = dx * dx + dz * dz
    let t = len2 > 0 ? ((x - x1) * dx + (z - z1) * dz) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const px = x1 + dx * t
    const pz = z1 + dz * t
    best = Math.min(best, Math.hypot(x - px, z - pz))
  }
  return best
}

/** Can a wandering creature stand here? (inside boundary, not on a mountain, not in a house) */
export function isWalkable(x: number, z: number): boolean {
  if (Math.hypot(x, z) > BOUNDARY_RADIUS - 5) return false
  for (const m of MOUNTAINS) {
    if (Math.hypot(x - m.x, z - m.z) < m.radius * 0.8) return false
  }
  // Keep villagers/wildlife out of the solid village houses (local-space AABB).
  for (const h of HOUSES) {
    const hw = (HOUSE_W * h.scale) / 2 + 1
    const hd = (HOUSE_D * h.scale) / 2 + 1
    const dx = x - h.x
    const dz = z - h.z
    const cos = Math.cos(h.rot)
    const sin = Math.sin(h.rot)
    const lx = cos * dx - sin * dz
    const lz = sin * dx + cos * dz
    if (Math.abs(lx) < hw && Math.abs(lz) < hd) return false
  }
  return true
}

// Deterministic RNG so rendering and colliders always agree
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildDecorations(): Decoration[] {
  const rand = mulberry32(20260110)
  const out: Decoration[] = []
  const forbidden = [
    { x: 0, z: 0, r: 7 },
    ...OUTPOSTS.map((o) => ({ x: o.x, z: o.z, r: 9 })),
    ...MOUNTAINS.map((m) => ({ x: m.x, z: m.z, r: m.radius * 0.65 })),
    ...HOUSES.map((h) => ({ x: h.x, z: h.z, r: 5.5 })),
  ]

  let guard = 0
  while (out.length < 240 && guard < 4000) {
    guard++
    const a = rand() * Math.PI * 2
    const d = 8 + Math.sqrt(rand()) * 52
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    if (Math.hypot(x, z) > BOUNDARY_RADIUS - 2) continue
    if (forbidden.some((f) => Math.hypot(x - f.x, z - f.z) < f.r)) continue
    // Keep the roads clear
    if (distanceToPath(x, z) < 3.4) continue

    const t = rand()
    let type: DecorationType = 'tree'
    if (t < 0.46) type = 'tree'
    else if (t < 0.76) type = 'rock'
    else if (t < 0.9) type = 'ruin'
    else type = 'lantern'

    out.push({
      type,
      x,
      y: getTerrainHeight(x, z),
      z,
      scale: 0.85 + rand() * 0.7,
      rot: rand() * Math.PI * 2,
    })
  }
  return out
}

export const DECORATIONS = buildDecorations()

function buildColliders(): Collider[] {
  const cols: Collider[] = []

  for (const d of DECORATIONS) {
    if (d.type === 'tree') cols.push({ x: d.x, z: d.z, r: 0.5 * d.scale })
    else if (d.type === 'rock') cols.push({ x: d.x, z: d.z, r: 0.8 * d.scale })
    else if (d.type === 'ruin') cols.push({ x: d.x, z: d.z, r: 0.55 * d.scale })
    // lanterns are thin — no collider
  }

  for (const m of MOUNTAINS) cols.push({ x: m.x, z: m.z, r: m.radius * 0.72 })

  // Archway pillars
  for (const arch of ARCHWAYS) {
    const c = Math.cos(arch.rot)
    const s = Math.sin(arch.rot)
    for (const lx of [-2.4, 2.4]) {
      cols.push({ x: arch.x + lx * c, z: arch.z - lx * s, r: 0.9 })
    }
  }

  // Zone pedestals + monument pillars (match ZONES geometry)
  for (const z of ZONES) {
    const zx = z.position[0]
    const zz = z.position[2]
    const r = z.radius
    cols.push({ x: zx, z: zz, r: 1.2 }) // center pedestal
    for (const lx of [-r * 0.5, r * 0.5]) {
      cols.push({ x: zx + lx, z: zz - r * 0.55, r: 0.9 }) // guardian pillars
    }
  }

  // Village houses: solid boxes approximated by an overlapping grid of circles
  // so the player can bump against them but never slip inside.
  for (const h of HOUSES) {
    const w = HOUSE_W * h.scale
    const d = HOUSE_D * h.scale
    const nCols = Math.max(2, Math.round(w / 1.5))
    const nRows = Math.max(2, Math.round(d / 1.5))
    const stepX = w / (nCols - 1)
    const stepZ = d / (nRows - 1)
    const cr = 0.62 * Math.max(stepX, stepZ)
    const cos = Math.cos(h.rot)
    const sin = Math.sin(h.rot)
    for (let i = 0; i < nCols; i++) {
      const lx = -w / 2 + i * stepX
      for (let j = 0; j < nRows; j++) {
        const lz = -d / 2 + j * stepZ
        cols.push({
          x: h.x + cos * lx + sin * lz,
          z: h.z - sin * lx + cos * lz,
          r: cr,
        })
      }
    }
  }

  return cols
}

export const COLLIDERS = buildColliders()

/** Push a point out of every overlapping collider (XZ plane). */
export function resolveCollisions(pos: { x: number; z: number }, radius: number): void {
  for (let i = 0; i < COLLIDERS.length; i++) {
    const c = COLLIDERS[i]
    const dx = pos.x - c.x
    const dz = pos.z - c.z
    const minD = c.r + radius
    const d2 = dx * dx + dz * dz
    if (d2 < minD * minD) {
      const d = Math.sqrt(d2) || 0.0001
      const push = (minD - d) / d
      pos.x += dx * push
      pos.z += dz * push
    }
  }
}

/** Keep a point inside the circular island boundary. */
export function clampToBoundary(pos: { x: number; z: number }): void {
  const d = Math.hypot(pos.x, pos.z)
  if (d > BOUNDARY_RADIUS) {
    const k = BOUNDARY_RADIUS / d
    pos.x *= k
    pos.z *= k
  }
}
