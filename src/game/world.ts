// Single source of truth for the game world(s): terrain height, static
// colliders, deterministic decorations and the circular island boundary.
//
// Every island is built from a `WorldMapDef` (see `game/maps.ts`). The query
// functions exported here keep working in *world space* and dispatch to the
// nearest island, so consumers (Character, Wildlife, NpcVillagers, camera,
// grass) never need to know which map they are standing on.
import type { Vector3 } from 'three'
import {
  MAP_DEFS,
  PRIMARY_MAP_ID,
  SEA_LEVEL,
  type Archway,
  type Collider,
  type Decoration,
  type DecorationType,
  type Hill,
  type Spot,
  type WorldMapDef,
} from './maps'

export type { Archway, Collider, Decoration, DecorationType, Hill, Spot, WorldMapDef }
export { SEA_LEVEL }

/** Mutable per-frame player state shared through refs (no React state churn). */
export interface PlayerState {
  position: Vector3
  rotation: number
  sprinting: boolean
  airborne: boolean
}

// Village house footprint (single shared base size — houses vary via uniform scale).
export const HOUSE_W = 4.2
export const HOUSE_D = 4.8
export const HOUSE_H = 3.2
/** How close the player must be to a house for its mini-zone prompt to appear. */
export const HOUSE_INTERACT_RADIUS = 5.8

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

/** A built, queryable island: the definition plus everything derived from it. */
export interface World {
  def: WorldMapDef
  decorations: Decoration[]
  colliders: Collider[]
  /** Terrain height at an island-local point (flat top, no rim cliffs). */
  terrainAt(x: number, z: number): number
  /** Rendered ground height at an island-local point (rim cliffs included). */
  surfaceAt(x: number, z: number): number
  /** Distance from an island-local point to the nearest roadway. */
  distanceToPath(x: number, z: number): number
  /** May ground cover (grass, flowers) grow at an island-local point? */
  groundCoverAllowed(x: number, z: number): boolean
  /** Forbidden circles used by the ground-cover test. */
  groundCoverForbidden: Spot[]
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
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

/** Terrain height at a point given in island-local coordinates. */
function localTerrainHeight(def: WorldMapDef, x: number, z: number): number {
  // Gentle rolling base
  let h =
    Math.sin(x * 0.055) * Math.cos(z * 0.05) * 1.15 +
    Math.sin(x * 0.12 + z * 0.1) * 0.5 +
    Math.cos(x * 0.09 - z * 0.13) * 0.4

  // Walkable hills (rounded)
  for (const hill of def.hills) {
    const d = Math.hypot(x - hill.x, z - hill.z)
    if (d < hill.radius) h += hill.height * smoothstep(1 - d / hill.radius)
  }
  // Mountains (peaked cones)
  for (const m of def.mountains) {
    const d = Math.hypot(x - m.x, z - m.z)
    if (d < m.radius) h += m.height * Math.pow(1 - d / m.radius, 1.35)
  }

  // Flatten around spawn plaza, outposts and houses so structures sit level
  for (const s of def.flatSpots) {
    const d = Math.hypot(x - s.x, z - s.z)
    if (d < s.r) {
      const core = s.r * 0.5
      const f = d < core ? 0 : smoothstep((d - core) / core)
      h *= f
    }
  }

  return h
}

/** Width of the cliff skirt between the island's flat top and its rim. */
const RIM_WIDTH = 15
/** How far the rim plunges below the flat top before the underside cone takes over. */
const RIM_DROP = 44

/**
 * How far the ground has fallen at radius `r`: zero on the island's flat top,
 * then a quadratic plunge to `RIM_DROP` under the rim. Sharing this between the
 * terrain mesh and the gameplay height query keeps the walkable ground and the
 * visible cliff in agreement all the way down to the waterline.
 */
function rimDepth(def: WorldMapDef, r: number): number {
  if (r <= def.terrainRadius) return 0
  const t = Math.min(1, (r - def.terrainRadius) / RIM_WIDTH)
  return t * t * RIM_DROP
}

/** Rendered ground height at an island-local point (rim cliffs included). */
function localSurfaceHeight(def: WorldMapDef, x: number, z: number): number {
  return localTerrainHeight(def, x, z) - rimDepth(def, Math.hypot(x, z))
}

/** Distance from an island-local point to the nearest ancient roadway. */
function localDistanceToPath(def: WorldMapDef, x: number, z: number): number {
  let best = Infinity
  for (const [x1, z1, x2, z2] of def.paths) {
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

function buildDecorations(def: WorldMapDef): Decoration[] {
  const rand = mulberry32(def.decorationSeed)
  const out: Decoration[] = []
  const forbidden: Spot[] = [
    { x: 0, z: 0, r: 7 },
    ...def.zones.map((z) => ({ x: z.position[0], z: z.position[2], r: 9 })),
    ...def.mountains.map((m) => ({ x: m.x, z: m.z, r: m.radius * 0.65 })),
    ...def.houses.map((h) => ({ x: h.x, z: h.z, r: 5.5 })),
    ...def.extraForbidden,
  ]

  let guard = 0
  while (out.length < def.decorationCount && guard < 4000) {
    guard++
    const a = rand() * Math.PI * 2
    const d = 8 + Math.sqrt(rand()) * 52
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    if (Math.hypot(x, z) > def.boundaryRadius - 2) continue
    if (forbidden.some((f) => Math.hypot(x - f.x, z - f.z) < f.r)) continue
    // Keep the roads clear
    if (localDistanceToPath(def, x, z) < 3.4) continue

    const t = rand()
    let type: DecorationType = 'tree'
    if (t < 0.46) type = 'tree'
    else if (t < 0.76) type = 'rock'
    else if (t < 0.9) type = 'ruin'
    else type = 'lantern'

    out.push({
      type,
      x,
      y: localTerrainHeight(def, x, z),
      z,
      scale: 0.85 + rand() * 0.7,
      rot: rand() * Math.PI * 2,
    })
  }
  return out
}

function buildColliders(def: WorldMapDef, decorations: Decoration[]): Collider[] {
  const cols: Collider[] = []

  for (const d of decorations) {
    if (d.type === 'tree') cols.push({ x: d.x, z: d.z, r: 0.5 * d.scale })
    else if (d.type === 'rock') cols.push({ x: d.x, z: d.z, r: 0.8 * d.scale })
    else if (d.type === 'ruin') cols.push({ x: d.x, z: d.z, r: 0.55 * d.scale })
    // lanterns are thin — no collider
  }

  for (const m of def.mountains) cols.push({ x: m.x, z: m.z, r: m.radius * 0.72 })

  // Archway pillars
  for (const arch of def.archways) {
    const c = Math.cos(arch.rot)
    const s = Math.sin(arch.rot)
    for (const lx of [-2.4, 2.4]) {
      cols.push({ x: arch.x + lx * c, z: arch.z - lx * s, r: 0.9 })
    }
  }

  // Zone pedestals + monument pillars (match ZONES geometry)
  for (const z of def.zones) {
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
  for (const h of def.houses) {
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

/** Forbidden circles for one island's ground cover (plaza, outposts, houses). */
function groundCoverForbidden(def: WorldMapDef): Spot[] {
  return [
    { x: 0, z: 0, r: 7 },
    ...def.zones.map((z) => ({ x: z.position[0], z: z.position[2], r: 9 })),
    ...def.houses.map((h) => ({ x: h.x, z: h.z, r: 5.5 })),
    ...def.extraForbidden,
  ]
}

function groundCoverAllowed(def: WorldMapDef, forbidden: Spot[], x: number, z: number): boolean {
  if (localDistanceToPath(def, x, z) < 2.6) return false
  for (const f of forbidden) {
    if (Math.hypot(x - f.x, z - f.z) < f.r) return false
  }
  return true
}

function buildWorld(def: WorldMapDef): World {
  const decorations = buildDecorations(def)
  const forbidden = groundCoverForbidden(def)
  return {
    def,
    decorations,
    colliders: buildColliders(def, decorations),
    terrainAt: (x, z) => localTerrainHeight(def, x, z),
    surfaceAt: (x, z) => localSurfaceHeight(def, x, z),
    distanceToPath: (x, z) => localDistanceToPath(def, x, z),
    groundCoverAllowed: (x, z) => groundCoverAllowed(def, forbidden, x, z),
    groundCoverForbidden: forbidden,
  }
}

const WORLDS: World[] = MAP_DEFS.map(buildWorld)
const WORLD_BY_ID = new Map<string, World>(WORLDS.map((w) => [w.def.id, w]))

/** Look an island up by id (defaults to the primary island). */
export function getWorld(id: string = PRIMARY_MAP_ID): World {
  return WORLD_BY_ID.get(id) ?? WORLDS[0]
}

export const WORLD_DEFS: WorldMapDef[] = MAP_DEFS

/**
 * Island whose origin is closest to a world point. `margin` widens the
 * catchment so the returned island is also used for the shallow ring of water
 * just off its coast (boats near shore still read sensible heights).
 */
function nearestWorld(x: number, z: number, margin = 24): World | null {
  let best: World | null = null
  let bestD = Infinity
  for (const w of WORLDS) {
    const d = Math.hypot(x - w.def.origin[0], z - w.def.origin[1])
    if (d < bestD) {
      bestD = d
      best = w
    }
  }
  if (!best || bestD > best.def.terrainRadius + margin) return null
  return best
}

/** Always returns an island (used by clamps that must pull a point somewhere). */
function nearestWorldAlways(x: number, z: number): World {
  let best = WORLDS[0]
  let bestD = Infinity
  for (const w of WORLDS) {
    const d = Math.hypot(x - w.def.origin[0], z - w.def.origin[1])
    if (d < bestD) {
      bestD = d
      best = w
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// World-space queries (dispatch to the nearest island)
// ---------------------------------------------------------------------------

/** Terrain height at a world position (XZ). Returns Y. Sea level far from land. */
export function getTerrainHeight(x: number, z: number): number {
  const w = nearestWorld(x, z)
  if (!w) return SEA_LEVEL
  return w.surfaceAt(x - w.def.origin[0], z - w.def.origin[1])
}

/** Distance from a world point to the nearest ancient roadway (Infinity at sea). */
export function distanceToPath(x: number, z: number): number {
  const w = nearestWorld(x, z)
  if (!w) return Infinity
  return w.distanceToPath(x - w.def.origin[0], z - w.def.origin[1])
}

/** Can grass / flowers grow at this world XZ? (clear of buildings + roadways) */
export function isGroundCoverAllowed(x: number, z: number): boolean {
  const w = nearestWorld(x, z)
  if (!w) return false
  return w.groundCoverAllowed(x - w.def.origin[0], z - w.def.origin[1])
}

/** Can a wandering creature stand here? (inside boundary, not on a mountain, not in a house) */
export function isWalkable(x: number, z: number): boolean {
  const w = nearestWorld(x, z)
  if (!w) return false
  const lx = x - w.def.origin[0]
  const lz = z - w.def.origin[1]
  if (Math.hypot(lx, lz) > w.def.walkRadius - 4) return false
  for (const m of w.def.mountains) {
    if (Math.hypot(lx - m.x, lz - m.z) < m.radius * 0.8) return false
  }
  // Keep villagers/wildlife out of the solid village houses (local-space AABB).
  for (const h of w.def.houses) {
    const hw = (HOUSE_W * h.scale) / 2 + 1
    const hd = (HOUSE_D * h.scale) / 2 + 1
    const dx = lx - h.x
    const dz = lz - h.z
    const cos = Math.cos(h.rot)
    const sin = Math.sin(h.rot)
    const alx = cos * dx - sin * dz
    const alz = sin * dx + cos * dz
    if (Math.abs(alx) < hw && Math.abs(alz) < hd) return false
  }
  return true
}

/** Push a point out of every overlapping collider (XZ plane). */
export function resolveCollisions(pos: { x: number; z: number }, radius: number): void {
  const w = nearestWorld(pos.x, pos.z)
  if (!w) return
  const cols = w.colliders
  const ox = w.def.origin[0]
  const oz = w.def.origin[1]
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i]
    const dx = pos.x - (c.x + ox)
    const dz = pos.z - (c.z + oz)
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

/** Keep a point inside the nearest island's walkable circle (which reaches the beach). */
export function clampToBoundary(pos: { x: number; z: number }): void {
  const w = nearestWorldAlways(pos.x, pos.z)
  const ox = w.def.origin[0]
  const oz = w.def.origin[1]
  const dx = pos.x - ox
  const dz = pos.z - oz
  const d = Math.hypot(dx, dz)
  const r = w.def.walkRadius
  if (d > r) {
    const k = r / d
    pos.x = ox + dx * k
    pos.z = oz + dz * k
  }
}

// ---------------------------------------------------------------------------
// Docks (world coordinates)
// ---------------------------------------------------------------------------

/** A pier, shifted into world space for gameplay code outside the island group. */
export interface Dock {
  id: string
  name: string
  /** Boarding spot on the beach (world). */
  x: number
  z: number
  rot: number
  boatX: number
  boatZ: number
  boatRot: number
}

/** Every pier across every island, in world coordinates. */
export const DOCKS: Dock[] = WORLDS.flatMap((w) =>
  w.def.docks.map((d) => ({
    id: d.id,
    name: d.name,
    x: d.x + w.def.origin[0],
    z: d.z + w.def.origin[1],
    rot: d.rot,
    boatX: d.boatX + w.def.origin[0],
    boatZ: d.boatZ + w.def.origin[1],
    boatRot: d.boatRot,
  }))
)

/** Rectangular sea box that keeps a boat inside the archipelago. */
export const SEA_BOUNDS = (() => {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const w of WORLDS) {
    const [ox, oz] = w.def.origin
    minX = Math.min(minX, ox)
    maxX = Math.max(maxX, ox)
    minZ = Math.min(minZ, oz)
    maxZ = Math.max(maxZ, oz)
  }
  return { minX: minX - 110, maxX: maxX + 110, minZ: minZ - 170, maxZ: maxZ + 170 }
})()

// ---------------------------------------------------------------------------
// Back-compat exports for the primary island (renderers read these directly)
// ---------------------------------------------------------------------------

const PRIMARY = getWorld(PRIMARY_MAP_ID)

export const TERRAIN_RADIUS = PRIMARY.def.terrainRadius
export const BOUNDARY_RADIUS = PRIMARY.def.boundaryRadius
export const HILLS: Hill[] = PRIMARY.def.hills
export const MOUNTAINS: Hill[] = PRIMARY.def.mountains
export const PATHS: Array<[number, number, number, number]> = PRIMARY.def.paths
export const ARCHWAYS: Archway[] = PRIMARY.def.archways
export const DECORATIONS: Decoration[] = PRIMARY.decorations
export const COLLIDERS: Collider[] = PRIMARY.colliders
