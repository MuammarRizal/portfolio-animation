import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ZONES, GEMS, type ZoneData } from '../data/portfolio'
import { getWorld } from '../game/world'
import { MAP_DEFS } from '../game/maps'
import { creatureRegistry } from '../game/creatures'
import { npcRegistry } from '../game/npcs'

interface MinimapProps {
  playerPos: THREE.Vector3
  playerRotation: number
  onTeleport: (zone: ZoneData) => void
  /** Height of the map card; the width follows the archipelago's aspect. */
  size?: number
  collectedIds?: number[]
}

const CREATURE_COLOR: Record<string, string> = {
  deer: '#b45309',
  sheep: '#64748b',
  rabbit: '#e2e8f0',
}

/** World-space box covering every island (plus a little sea), and the mapping
 * that squeezes it into the card. */
function useSeaMap(width: number, height: number) {
  return useMemo(() => {
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const def of MAP_DEFS) {
      const r = def.terrainRadius
      minX = Math.min(minX, def.origin[0] - r)
      maxX = Math.max(maxX, def.origin[0] + r)
      minZ = Math.min(minZ, def.origin[1] - r)
      maxZ = Math.max(maxZ, def.origin[1] + r)
    }
    const padX = 14
    const padZ = 14
    minX -= padX
    maxX += padX
    minZ -= padZ
    maxZ += padZ

    const scale = Math.min(width / (maxX - minX), height / (maxZ - minZ))
    const cx = (minX + maxX) / 2
    const cz = (minZ + maxZ) / 2
    const px = (x: number) => width / 2 + (x - cx) * scale
    const py = (z: number) => height / 2 + (z - cz) * scale
    return { px, py, scale }
  }, [width, height])
}

/** Static world layer (islands, roads, hills, mountains, props) — memoized. */
const StaticLayer = React.memo(function StaticLayer({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const { px, py, scale } = useSeaMap(width, height)
  const detailed = width >= 170

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 pointer-events-none">
      {/* open sea */}
      <rect width={width} height={height} fill="#bae6fd" />

      {MAP_DEFS.map((def) => {
        const world = getWorld(def.id)
        const [ox, oz] = def.origin
        const palette = def.palette
        return (
          <g key={def.id}>
            {/* landmass */}
            <circle cx={px(ox)} cy={py(oz)} r={def.terrainRadius * scale} fill={palette.ground} />

            {/* rolling hills */}
            {def.hills.map((h, i) => (
              <circle
                key={`h${i}`}
                cx={px(ox + h.x)}
                cy={py(oz + h.z)}
                r={h.radius * scale}
                fill={palette.groundLight}
                opacity={0.6}
              />
            ))}

            {/* mountains */}
            {def.mountains.map((m, i) => (
              <g key={`m${i}`}>
                <circle cx={px(ox + m.x)} cy={py(oz + m.z)} r={m.radius * scale} fill={palette.rock} />
                <circle
                  cx={px(ox + m.x)}
                  cy={py(oz + m.z)}
                  r={m.radius * scale * 0.55}
                  fill={palette.snow}
                  opacity={0.85}
                />
              </g>
            ))}

            {/* ancient roads */}
            {def.paths.map((p, i) => (
              <line
                key={`p${i}`}
                x1={px(ox + p[0])}
                y1={py(oz + p[2])}
                x2={px(ox + p[1])}
                y2={py(oz + p[3])}
                stroke={palette.path}
                strokeWidth={detailed ? 3 : 2}
                strokeLinecap="round"
                opacity={0.95}
              />
            ))}

            {/* props: trees & rocks (skipped on the tiny mobile radar) */}
            {detailed &&
              world.decorations
                .filter((d) => d.type === 'tree' || d.type === 'rock')
                .map((d, i) => (
                  <circle
                    key={`d${i}`}
                    cx={px(ox + d.x)}
                    cy={py(oz + d.z)}
                    r={d.type === 'tree' ? 1.5 : 1}
                    fill={d.type === 'tree' ? '#15803d' : '#78716c'}
                    opacity={0.7}
                  />
                ))}

            {/* piers */}
            {def.docks.map((d) => (
              <circle key={d.id} cx={px(ox + d.boatX)} cy={py(oz + d.boatZ)} r={2.6} fill="#0ea5e9" stroke="#ffffff" strokeWidth={0.8} />
            ))}

            {/* village houses (solid mini-zones) */}
            {def.houses.map((h, i) => (
              <g key={`hs${i}`}>
                <rect
                  x={px(ox + h.x) - 1.9}
                  y={py(oz + h.z) - 1.9}
                  width={3.8}
                  height={3.8}
                  rx={0.8}
                  fill={h.color}
                  stroke="#ffffff"
                  strokeWidth={0.6}
                  opacity={0.92}
                />
              </g>
            ))}

            {/* visible stone ring */}
            <circle
              cx={px(ox)}
              cy={py(oz)}
              r={def.boundaryRadius * scale}
              fill="none"
              stroke="#facc15"
              strokeWidth={detailed ? 1.6 : 1.2}
              strokeDasharray={detailed ? '4 3' : undefined}
              opacity={0.9}
            />
          </g>
        )
      })}
    </svg>
  )
})

export const Minimap: React.FC<MinimapProps> = ({
  playerPos,
  playerRotation,
  onTeleport,
  size = 150,
  collectedIds = [],
}) => {
  const aspect = 2.05
  const height = size
  const width = Math.round(size * aspect)
  const { px, py } = useSeaMap(width, height)
  const detailed = width >= 170

  const collected = useMemo(() => new Set(collectedIds), [collectedIds])

  // Read live creatures from the shared registry (same data combat uses).
  const creatures = useMemo(
    () => Array.from(creatureRegistry.values()).filter((cr) => cr.alive),
    // Re-evaluate whenever the HUD snapshot updates (~10 Hz).
    [playerPos, collectedIds]
  )

  // Friendly villagers — always present, plotted so the world feels populated.
  const villagers = useMemo(
    () => Array.from(npcRegistry.values()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerPos, collectedIds]
  )

  // Which island is the hero nearest? Drives the header label and how far the
  // fast-travel hotspots reach — you cannot teleport across open water, the
  // boat is the only way between islands.
  const nearest = useMemo(() => {
    let best = MAP_DEFS[0]
    let bestD = Infinity
    for (const def of MAP_DEFS) {
      const d = Math.hypot(playerPos.x - def.origin[0], playerPos.z - def.origin[1])
      if (d < bestD) {
        bestD = d
        best = def
      }
    }
    const label = bestD > best.terrainRadius + 30 ? 'Laut Lepas' : best.name
    const zoneIds = new Set(getWorld(best.id).def.zones.map((z) => z.id))
    return { label, zoneIds }
  }, [playerPos])

  const playerCoord = { px: px(playerPos.x), py: py(playerPos.z) }

  return (
    <div className="relative p-2 rounded-2xl bg-white/85 backdrop-blur-md border border-white/70 shadow-lg shadow-slate-900/5 select-none">
      <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between px-1">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" /> RADAR
        </span>
        <span className="text-[9px] font-mono text-slate-400 uppercase">{nearest.label}</span>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border border-white/80 bg-sky-50/80"
        style={{ width, height }}
      >
        <StaticLayer width={width} height={height} />

        {/* Dynamic layer: gems + creatures + villagers */}
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 pointer-events-none">
          {GEMS.map((g) => {
            const isCollected = collected.has(g.id)
            return (
              <circle
                key={g.id}
                cx={px(g.x)}
                cy={py(g.z)}
                r={detailed ? 2.2 : 1.8}
                fill={isCollected ? '#cbd5e1' : g.color}
                opacity={isCollected ? 0.5 : 1}
              />
            )
          })}

          {creatures.map((cr) => (
            <circle
              key={cr.id}
              cx={px(cr.pos.x)}
              cy={py(cr.pos.z)}
              r={detailed ? 2 : 1.7}
              fill={CREATURE_COLOR[cr.type] ?? '#94a3b8'}
              stroke="#1e293b"
              strokeWidth={0.4}
            />
          ))}

          {/* Villagers: square markers so they read as humans, not animals */}
          {villagers.map((npc) => {
            const s = detailed ? 4 : 3.2
            return (
              <rect
                key={npc.id}
                x={px(npc.pos.x) - s / 2}
                y={py(npc.pos.z) - s / 2}
                width={s}
                height={s}
                rx={1}
                fill={npc.color}
                stroke="#ffffff"
                strokeWidth={0.7}
              />
            )
          })}
        </svg>

        {/* Zone teleport hotspots */}
        {ZONES.map((zone) => {
          const zx = px(zone.position[0])
          const zy = py(zone.position[2])
          const reachable = nearest.zoneIds.has(zone.id)
          if (!reachable) return null
          return (
            <button
              key={zone.id}
              onClick={() => onTeleport(zone)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition transform hover:scale-125"
              style={{ left: `${zx}px`, top: `${zy}px` }}
              title={`Teleport ke ${zone.title}`}
            >
              <div
                className="w-3 h-3 rounded-full border border-white flex items-center justify-center shadow-md animate-pulse"
                style={{ backgroundColor: zone.color }}
              >
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
            </button>
          )
        })}

        {/* Player marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
          style={{ left: `${playerCoord.px}px`, top: `${playerCoord.py}px` }}
        >
          <div className="w-3.5 h-3.5 flex items-center justify-center" style={{ transform: `rotate(${playerRotation}rad)` }}>
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-blue-600 drop-shadow-[0_0_3px_rgba(37,99,235,0.7)]" />
          </div>
        </div>
      </div>
    </div>
  )
}
