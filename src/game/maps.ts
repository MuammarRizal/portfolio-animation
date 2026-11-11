// Island registry — the single place every playable map is described.
//
// A map definition carries two things: the terrain recipe (hills, mountains,
// roads, palette, radius) and the content that lives on it (zones, gems,
// houses, villagers). `world.ts` turns a definition into a queryable world,
// and the renderers read the definition to draw the right biome.
//
// Content is grouped per island in `data/portfolio.ts` / `game/npcs.ts`, and
// those modules still export the flattened aggregates (`ZONES`, `GEMS`, …) so
// the HUD and the proximity loops can treat all islands as one world.
import { ISLANDS, type GemData, type HouseData, type ZoneData } from '../data/portfolio'
import { ISLAND_VILLAGERS, type VillagerDef } from './npcs'

export type DecorationType = 'tree' | 'rock' | 'ruin' | 'lantern'

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

export interface Archway {
  x: number
  z: number
  rot: number
}

/** A plain forest/keep-out circle in island-local space. */
export interface Spot {
  x: number
  z: number
  r: number
}

export interface Decoration {
  type: DecorationType
  x: number
  y: number
  z: number
  scale: number
  rot: number
}

/** A pier the player can board a boat from. */
export interface DockDef {
  id: string
  name: string
  /** Boarding spot on land (island-local space). */
  x: number
  z: number
  rot: number
  /** Where the moored boat floats, at sea. */
  boatX: number
  boatZ: number
  boatRot: number
}

/** Everything the terrain shader / ground cover needs to look like a biome. */
export interface BiomePalette {
  ground: string
  groundLight: string
  path: string
  sand: string
  rock: string
  snow: string
  cliff: string
  /** Terrain height where rock starts to blend in. */
  rockHeight: number
  /** Terrain height where snow starts to blend in. */
  snowHeight: number
  /** Grass tuft hues. */
  grass: string[]
  /** One petal colour per flower species (daisy, tulip, cornflower, buttercup). */
  flowers: [string, string, string, string]
  skyBackground: string
  fog: string
  fogNear: number
  fogFar: number
  oceanDeep: string
  oceanSurface: string
  oceanSky: string
}

export interface WorldMapDef {
  id: string
  name: string
  subtitle: string
  /** World-space centre of the island. */
  origin: [number, number]
  terrainRadius: number
  boundaryRadius: number
  hills: Hill[]
  mountains: Hill[]
  paths: Array<[number, number, number, number]>
  archways: Archway[]
  /** Extra keep-out circles for decorations and ground cover. */
  extraForbidden: Spot[]
  decorationSeed: number
  decorationCount: number
  /** Flattened pads (spawn plaza, outposts, houses) so structures sit level. */
  flatSpots: Spot[]
  /** Where the player appears when the world loads (island-local space). */
  spawn: [number, number]
  palette: BiomePalette
  docks: DockDef[]
  zones: ZoneData[]
  gems: GemData[]
  houses: HouseData[]
  villagers: VillagerDef[]
}

/** Sea surface height. Islands are carved down into it; boats float on it. */
export const SEA_LEVEL = -30

// ---------------------------------------------------------------------------
// Island I — "Pulau Hijau" (the original sunny realm)
// ---------------------------------------------------------------------------

const hijau = ISLANDS.hijau

const HIJAU_OUTPOSTS: Spot[] = hijau.zones.map((z) => ({ x: z.position[0], z: z.position[2], r: 12 }))
const HIJAU_HOUSE_PADS: Spot[] = hijau.houses.map((h) => ({ x: h.x, z: h.z, r: 6 }))

const islandHijau: WorldMapDef = {
  id: hijau.id,
  name: hijau.name,
  subtitle: hijau.subtitle,
  origin: [0, 0],
  terrainRadius: 66,
  boundaryRadius: 60,
  hills: [
    { x: -20, z: 8, radius: 15, height: 4.6 },
    { x: 24, z: -8, radius: 13, height: 4.0 },
    { x: 12, z: 28, radius: 15, height: 5.4 },
    { x: -26, z: -12, radius: 12, height: 3.6 },
    { x: 34, z: 22, radius: 13, height: 4.2 },
    { x: -10, z: -36, radius: 13, height: 4.8 },
    { x: 6, z: -18, radius: 10, height: 2.8 },
  ],
  mountains: [
    { x: -48, z: 6, radius: 10, height: 20 },
    { x: 48, z: -44, radius: 11, height: 23 },
    { x: -50, z: -54, radius: 9, height: 17 },
    { x: 52, z: 50, radius: 10, height: 19 },
  ],
  paths: [
    [0, 0, -36, -32],
    [0, 0, 36, -32],
    [0, 0, -36, 36],
    [0, 0, 36, 36],
  ],
  archways: [
    { x: -9, z: -8, rot: 0.84 },
    { x: -27, z: -24, rot: 0.84 },
    { x: 9, z: -8, rot: -0.84 },
    { x: 27, z: -24, rot: -0.84 },
    { x: -9, z: 9, rot: -0.9 },
    { x: 9, z: 9, rot: 0.9 },
  ],
  extraForbidden: [],
  decorationSeed: 20260110,
  decorationCount: 240,
  flatSpots: [{ x: 0, z: 0, r: 10 }, ...HIJAU_OUTPOSTS, ...HIJAU_HOUSE_PADS],
  spawn: [0, 0],
  palette: {
    ground: '#6aa03f',
    groundLight: '#83c04d',
    path: '#cdb98e',
    sand: '#d8c79b',
    rock: '#9aa3ac',
    snow: '#eef3f7',
    cliff: '#7c848d',
    rockHeight: 6,
    snowHeight: 13,
    grass: ['#4d7c0f', '#5c8a2e', '#65a30d', '#79b41f', '#3f6212', '#84cc16', '#6aa03f'],
    flowers: ['#ffffff', '#ef4444', '#3b82f6', '#facc15'],
    skyBackground: '#bfe3ff',
    fog: '#cfe6ff',
    fogNear: 100,
    fogFar: 300,
    oceanDeep: '#0b3450',
    oceanSurface: '#2a86ad',
    oceanSky: '#cfe6ff',
  },
  docks: [],
  zones: hijau.zones,
  gems: hijau.gems,
  houses: hijau.houses,
  villagers: ISLAND_VILLAGERS[hijau.id] ?? [],
}

/** Every island definition, in load order. */
export const MAP_DEFS: WorldMapDef[] = [islandHijau]

/** The island the game boots on. */
export const PRIMARY_MAP_ID = islandHijau.id

export function getMapDef(id: string): WorldMapDef | undefined {
  return MAP_DEFS.find((m) => m.id === id)
}
