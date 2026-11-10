import React from 'react'
import * as THREE from 'three'
import { ZONES, type ZoneData } from '../data/portfolio'

interface MinimapProps {
  playerPos: THREE.Vector3
  playerRotation: number
  onTeleport: (zone: ZoneData) => void
}

export const Minimap: React.FC<MinimapProps> = ({ playerPos, playerRotation, onTeleport }) => {
  // Realm bounds are +/- 64
  const mapRadius = 66
  const minimapSize = 130
  const center = minimapSize / 2

  const toMinimapCoords = (x: number, z: number) => {
    const px = center + (x / mapRadius) * (center - 12)
    const py = center + (z / mapRadius) * (center - 12)
    return { px, py }
  }

  const playerCoord = toMinimapCoords(playerPos.x, playerPos.z)

  return (
    <div className="relative p-2 rounded-2xl bg-white/85 backdrop-blur-md border border-white/70 shadow-lg shadow-slate-900/5 select-none">
      <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between px-1">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" /> RADAR
        </span>
        <span className="text-[9px] font-mono text-slate-400">REALM</span>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border border-white/80 bg-sky-50/80"
        style={{ width: minimapSize, height: minimapSize }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full rounded-full border border-sky-300/60" />
          <div className="w-2/3 h-2/3 rounded-full border border-sky-300/50 absolute" />
          <div className="w-1/3 h-1/3 rounded-full border border-sky-300/40 absolute" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-400/10 to-transparent animate-spin duration-3000" />
        </div>

        {ZONES.map((zone) => {
          const { px, py } = toMinimapCoords(zone.position[0], zone.position[2])
          return (
            <button
              key={zone.id}
              onClick={() => onTeleport(zone)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition transform hover:scale-125"
              style={{ left: `${px}px`, top: `${py}px` }}
              title={`Teleport to ${zone.title}`}
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

        <div
          className="absolute w-2 h-2 rounded-full bg-slate-400 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${center}px`, top: `${center}px` }}
        />

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
