import React, { useState } from 'react'
import {
  Compass,
  Sparkles,
  Volume2,
  VolumeX,
  HelpCircle,
  Maximize2,
  Gem,
  Sliders,
  Zap,
  ArrowUp,
  Hand,
} from 'lucide-react'
import * as THREE from 'three'
import { ZONES, type ZoneData } from '../data/portfolio'
import { Minimap } from './Minimap'
import { QuestTracker, type QuestState } from './QuestTracker'
import { VirtualJoystick } from './VirtualJoystick'

interface GameUIProps {
  activeZone: ZoneData | null
  playerPos: THREE.Vector3
  playerRotation: number
  gemCount: number
  totalGems: number
  quests: QuestState
  quality: 'high' | 'low'
  onQualityChange: (quality: 'high' | 'low') => void
  onOpenZone: (zone: ZoneData) => void
  onTeleport: (zone: ZoneData) => void
  onVirtualMove: (dir: { x: number; y: number }) => void
  onVirtualJump: () => void
  onVirtualSprint: (sprinting: boolean) => void
}

export const GameUI: React.FC<GameUIProps> = ({
  activeZone,
  playerPos,
  playerRotation,
  gemCount,
  totalGems,
  quests,
  quality,
  onQualityChange,
  onOpenZone,
  onTeleport,
  onVirtualMove,
  onVirtualJump,
  onVirtualSprint,
}) => {
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isAudioMuted, setIsAudioMuted] = useState(true)
  const [isSprintActive, setIsSprintActive] = useState(false)

  const toggleMobileSprint = () => {
    const next = !isSprintActive
    setIsSprintActive(next)
    onVirtualSprint(next)
  }

  const panel = 'bg-white/85 backdrop-blur-md border border-white/70 shadow-lg shadow-slate-900/5'
  const iconBtn = `${panel} p-2 sm:p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer`

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-3 sm:p-5">
      {/* 1. TOP HEADER BAR */}
      <header className="flex items-start justify-between pointer-events-auto gap-3">
        <div className={`flex items-center gap-2.5 sm:gap-3 ${panel} px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl`}>
          <div className="relative">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-500" />
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-500 absolute inset-0 animate-ping opacity-75" />
          </div>
          <div>
            <h1 className="text-xs sm:text-base font-black tracking-wide text-slate-900 flex items-center gap-1.5">
              MUAMMAR RIZAL{' '}
              <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
                RPG WORLD
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-600 hidden md:block">
              Open World Portfolio • Explore, Jump, and Inspect My Works
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl ${panel} text-xs font-bold text-amber-600`}>
            <Gem className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 animate-bounce" />
            <span>
              {gemCount}/{totalGems}
            </span>
          </div>

          <button onClick={() => setIsAudioMuted(!isAudioMuted)} className={iconBtn} title={isAudioMuted ? 'Unmute SFX' : 'Mute SFX'}>
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />}
          </button>

          <button onClick={() => setShowSettings(!showSettings)} className={iconBtn} title="Settings">
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button onClick={() => setShowHelp(!showHelp)} className={iconBtn} title="Controls & Guide">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
              else document.exitFullscreen().catch(() => {})
            }}
            className={`${iconBtn} hidden sm:block`}
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MIDDLE: QUEST LOG (LEFT) & MINIMAP (RIGHT) */}
      <div className="flex justify-between items-start pointer-events-none mt-2">
        <div className="pointer-events-auto">
          <QuestTracker quests={quests} gemsCollected={gemCount} totalGems={totalGems} />
        </div>
        <div className="pointer-events-auto">
          <Minimap playerPos={playerPos} playerRotation={playerRotation} onTeleport={onTeleport} />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="pointer-events-auto absolute top-20 right-4 md:right-6 w-72 p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/70 shadow-2xl text-xs space-y-4 z-50 animate-in fade-in">
          <div className="flex justify-between items-center text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
            <span>⚙️ Graphics & Settings</span>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">✕</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-slate-500 block mb-1">Visual Fidelity</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onQualityChange('high')}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    quality === 'high' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  Ultra (60 FPS)
                </button>
                <button
                  onClick={() => onQualityChange('low')}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    quality === 'low' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  Battery Saver
                </button>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2">
              Optimized for smooth real-time WebGL rendering across mobile & desktop.
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="pointer-events-auto absolute top-20 right-4 md:right-6 w-80 p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/70 shadow-2xl text-xs space-y-3.5 z-50 animate-in fade-in">
          <div className="flex justify-between items-center text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
            <span>🎮 Adventure Controls Guide</span>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">✕</button>
          </div>
          <div className="space-y-2.5 text-slate-600">
            <div className="flex justify-between items-center">
              <span>Gerak Karakter</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">W A S D / Analog Kiri</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Lompat (Jump)</span>
              <span className="font-mono bg-amber-50 px-2 py-0.5 rounded text-amber-700 border border-amber-200">Spacebar / JUMP</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Sprint (Lari Cepat)</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">Shift / SPRINT</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Putar Kamera (Orbit)</span>
              <span className="font-mono bg-cyan-50 px-2 py-0.5 rounded text-cyan-700 border border-cyan-200">Drag Mouse / Layar</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Interaksi / Buka Zona</span>
              <span className="font-mono bg-blue-50 px-2 py-0.5 rounded text-blue-700 border border-blue-200">E / OPEN</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-200 pt-2 leading-relaxed">
            ☀️ Siang cerah, rumput bergoyang, dan satwa liar berkeliaran. Kumpulkan ke-16 kristal energi untuk jadi <b>Island Master</b>!
          </p>
        </div>
      )}

      {/* 3. CENTER INTERACTION PROMPT */}
      {activeZone && (
        <div className="self-center pointer-events-auto animate-bounce mb-2">
          <button
            onClick={() => onOpenZone(activeZone)}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/90 hover:bg-white border-2 text-slate-900 font-bold shadow-xl backdrop-blur-md transition transform hover:scale-105 cursor-pointer"
            style={{ borderColor: activeZone.color, boxShadow: `0 0 25px ${activeZone.color}60` }}
          >
            <span className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: activeZone.color }} />
            <span>Inspect {activeZone.title}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">[E]</span>
          </button>
        </div>
      )}

      {/* 4. BOTTOM BAR */}
      <footer className="flex flex-col gap-3 pointer-events-auto">
        <div className={`hidden sm:flex self-start items-center gap-1.5 p-1.5 rounded-2xl ${panel} overflow-x-auto max-w-full`}>
          <div className="px-2 text-slate-500 text-xs font-semibold flex items-center gap-1 shrink-0">
            <Compass className="w-3.5 h-3.5 text-blue-600" /> Fast Travel:
          </div>
          {ZONES.map((zone) => (
            <button
              key={zone.id}
              onClick={() => onTeleport(zone)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 shrink-0 hover:bg-white cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
              {zone.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* MOBILE CONTROLLER */}
        <div className="flex md:hidden items-end justify-between w-full pb-2 px-1">
          <div className="touch-none">
            <VirtualJoystick onMove={onVirtualMove} />
          </div>

          <div className="flex flex-col items-end gap-2.5 touch-none">
            <div className="flex items-center gap-2">
              {activeZone && (
                <button
                  onClick={() => onOpenZone(activeZone)}
                  className="w-13 h-13 rounded-full flex flex-col items-center justify-center font-black shadow-lg border-2 transition active:scale-95 animate-bounce"
                  style={{ backgroundColor: `${activeZone.color}dd`, borderColor: '#ffffff', color: '#ffffff', boxShadow: `0 0 16px ${activeZone.color}` }}
                >
                  <Hand className="w-5 h-5" />
                  <span className="text-[8px] tracking-tight">OPEN</span>
                </button>
              )}

              <button
                onClick={toggleMobileSprint}
                className={`w-13 h-13 rounded-full flex flex-col items-center justify-center font-bold shadow-lg border transition active:scale-95 ${
                  isSprintActive
                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 border-cyan-300 text-white shadow-cyan-500/40 ring-2 ring-cyan-400'
                    : 'bg-white/85 border-white/70 text-slate-600'
                }`}
              >
                <Zap className={`w-5 h-5 ${isSprintActive ? 'text-yellow-300 fill-yellow-300 animate-pulse' : ''}`} />
                <span className="text-[8px] tracking-tight">SPRINT</span>
              </button>
            </div>

            <button
              onClick={onVirtualJump}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 active:from-amber-500 active:to-orange-600 flex flex-col items-center justify-center text-white font-black shadow-xl border-2 border-white/70 active:scale-95 transition"
            >
              <ArrowUp className="w-7 h-7 stroke-[3]" />
              <span className="text-[9px] font-mono tracking-tighter -mt-1">JUMP</span>
            </button>
          </div>
        </div>

        {/* DESKTOP HINT */}
        <div className={`hidden md:flex items-center justify-between text-xs text-slate-500 ${panel} px-3.5 py-2 rounded-xl`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              <b className="text-slate-700">WASD</b> Gerak • <b className="text-slate-700">SPACE</b> Lompat • <b className="text-slate-700">SHIFT</b> Sprint • <b className="text-slate-700">E</b> Buka Zona • <b className="text-slate-700">Drag</b> Putar Kamera
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Muammar Rizal © 2026</span>
        </div>
      </footer>
    </div>
  )
}
