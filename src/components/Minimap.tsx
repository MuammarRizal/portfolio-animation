import React, { useMemo } from 'react'
import * as THREE from 'three'
import { ZONES, GEMS, HOUSES, type ZoneData } from '../data/portfolio'
import {
  ARCHWAYS,
  BOUNDARY_RADIUS,
  DECORATIONS,
  HILLS,
  MOUNTAINS,
  PATHS,
  TERRAIN_RADIUS,
} from '../game/world'
import { creatureRegistry } from '../game/creatures'
import { npcRegistry } from '../game/npcs'

interface MinimapProps {
  playerPos: THREE.Vector3
  playerRotation: number
  onTeleport: (zone: ZoneData) => void
  size?: number
  collectedIds?: number[]
}

const MAP_RADIUS = 66

const CREATURE_COLOR: Record<string, string> = {
  deer: '#b45309',
  sheep: '#64748b',
  rabbit: '#e2e8f0',
}

/** Static world layer (island, roads, hills, mountains, props) — memoized per size. */
const StaticLayer = React.memo(function StaticLayer({ size }: { size: number }) {
  const c = size / 2
  const pad = Math.max(8, size * 0.1)
  const scale = (c - pad) / MAP_RADIUS
  const px = (x: number) => c + x * scale
  const py = (z: number) => c + z * scale
  const detailed = size >= 100

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none">
      {/* ocean */}
      <rect width={size} height={size} fill="#bae6fd" />

      {/* landmass */}
      <circle cx={c} cy={c} r={TERRAIN_RADIUS * scale} fill="#86efac" />

      {/* rolling hills */}
      {HILLS.map((h, i) => (
        <circle key={`h${i}`} cx={px(h.x)} cy={py(h.z)} r={h.radius * scale} fill="#4ade80" opacity={0.55} />
      ))}

      {/* mountains */}
      {MOUNTAINS.map((m, i) => (
        <g key={`m${i}`}>
          <circle cx={px(m.x)} cy={py(m.z)} r={m.radius * scale} fill="#94a3b8" />
          <circle cx={px(m.x)} cy={py(m.z)} r={m.radius * scale * 0.55} fill="#cbd5e1" opacity={0.85} />
        </g>
      ))}

      {/* ancient roads */}
      {PATHS.map((p, i) => (
        <line
          key={`p${i}`}
          x1={px(p[0])}
          y1={py(p[2])}
          x2={px(p[1])}
          y2={py(p[3])}
          stroke="#fde68a"
          strokeWidth={detailed ? 4 : 3}
          strokeLinecap="round"
          opacity={0.95}
        />
      ))}

      {/* props: trees & rocks (skipped on the tiny mobile radar) */}
      {detailed &&
        DECORATIONS.filter((d) => d.type === 'tree' || d.type === 'rock').map((d, i) => (
          <circle
            key={`d${i}`}
            cx={px(d.x)}
            cy={py(d.z)}
            r={d.type === 'tree' ? 1.8 : 1.2}
            fill={d.type === 'tree' ? '#15803d' : '#78716c'}
            opacity={0.75}
          />
        ))}

      {/* archways */}
      {ARCHWAYS.map((a, i) => (
        <rect
          key={`a${i}`}
          x={px(a.x) - 1.6}
          y={py(a.z) - 1.6}
          width={3.2}
          height={3.2}
          rx={0.6}
          fill="#f59e0b"
          opacity={0.85}
        />
      ))}

      {/* village houses (solid mini-zones) */}
      {HOUSES.map((h, i) => (
        <g key={`hs${i}`}>
          <rect
            x={px(h.x) - 2.2}
            y={py(h.z) - 2.2}
            width={4.4}
            height={4.4}
            rx={0.9}
            fill={h.color}
            stroke="#ffffff"
            strokeWidth={0.7}
            opacity={0.92}
          />
          <rect
            x={px(h.x) - 1.1}
            y={py(h.z) - 2.6}
            width={2.2}
            height={0.9}
            rx={0.3}
            fill="#ffffff"
            opacity={0.85}
          />
        </g>
      ))}

      {/* island boundary */}
      <circle
        cx={c}
        cy={c}
        r={BOUNDARY_RADIUS * scale}
        fill="none"
        stroke="#facc15"
        strokeWidth={detailed ? 2 : 1.5}
        strokeDasharray={detailed ? '5 4' : undefined}
      />
    </svg>
  )
})

export const Minimap: React.FC<MinimapProps> = ({
  playerPos,
  playerRotation,
  onTeleport,
  size = 130,
  collectedIds = [],
}) => {
  const center = size / 2
  const pad = Math.max(8, size * 0.1)
  const scale = (center - pad) / MAP_RADIUS
  const px = (x: number) => center + x * scale
  const py = (z: number) => center + z * scale
  const detailed = size >= 100

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

  const playerCoord = { px: px(playerPos.x), py: py(playerPos.z) }

  return (
    <div className="relative p-2 rounded-2xl bg-white/85 backdrop-blur-md border border-white/70 shadow-lg shadow-slate-900/5 select-none">
      <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between px-1">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" /> RADAR
        </span>
        <span className="text-[9px] font-mono text-slate-400">DUNIA</span>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border border-white/80 bg-sky-50/80"
        style={{ width: size, height: size }}
      >
        <StaticLayer size={size} />

        {/* Dynamic layer: gems + creatures */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none">
          {GEMS.map((g) => {
            const isCollected = collected.has(g.id)
            return (
              <circle
                key={g.id}
                cx={px(g.x)}
                cy={py(g.z)}
                r={detailed ? 2.4 : 2}
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
              r={detailed ? 2.2 : 1.8}
              fill={CREATURE_COLOR[cr.type] ?? '#94a3b8'}
              stroke="#1e293b"
              strokeWidth={0.4}
            />
          ))}

          {/* Villagers: square markers so they read as humans, not animals */}
          {villagers.map((npc) => {
            const s = detailed ? 4.4 : 3.6
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
          return (
            <button
              key={zone.id}
              onClick={() => onTeleport(zone)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition transform hover:scale-125"
              style={{ left: `${zx}px`, top: `${zy}px` }}
              title={`Teleport ke ${zone.title}`}
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center shadow-md animate-pulse"
                style={{ backgroundColor: zone.color }}
              >
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
            </button>
          )
        })}

        {/* Spawn plaza */}
        <div
          className="absolute w-2 h-2 rounded-full bg-slate-400 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${center}px`, top: `${center}px` }}
        />

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
