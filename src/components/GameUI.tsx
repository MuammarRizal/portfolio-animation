import React, { useEffect, useState } from 'react'
import {
  Compass,
  Sparkles,
  Volume2,
  VolumeX,
  HelpCircle,
  Maximize2,
  Minimize2,
  Smartphone,
  Gem,
  Sliders,
  Zap,
  ArrowUp,
  Hand,
  Sword,
  Server,
  UserRound,
  Home,
  MessageSquare,
} from 'lucide-react'
import * as THREE from 'three'
import { ZONES, type HouseData, type ZoneData } from '../data/portfolio'
import type { VillagerDef } from '../game/npcs'
import type { CharacterPreset } from '../game/characters'
import { isMuted, setMuted, subscribeMuted, sfx } from '../game/audio'
import { Minimap } from './Minimap'
import { QuestTracker, type QuestState } from './QuestTracker'
import { VirtualJoystick } from './VirtualJoystick'
import { CharacterPicker } from './CharacterPicker'

/** Tiny pill toggle used in the settings menu. */
const Switch: React.FC<{ on: boolean }> = ({ on }) => (
  <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${on ? 'bg-blue-600' : 'bg-slate-300'}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
  </span>
)

interface GameUIProps {
  activeZone: ZoneData | null
  activeHouse: HouseData | null
  activeNpc: VillagerDef | null
  playerPos: THREE.Vector3
  playerRotation: number
  gemCount: number
  totalGems: number
  collectedIds: number[]
  hunts: number
  quests: QuestState
  housesVisited: number
  totalHouses: number
  npcsTalked: number
  totalNpcs: number
  quality: 'high' | 'low'
  onQualityChange: (quality: 'high' | 'low') => void
  character: CharacterPreset
  onCharacterChange: (id: string) => void
  onOpenZone: (zone: ZoneData) => void
  onOpenHouse: (house: HouseData) => void
  onOpenNpc: (npc: VillagerDef) => void
  onTeleport: (zone: ZoneData) => void
  onVirtualMove: (dir: { x: number; y: number }) => void
  onVirtualJump: () => void
  onVirtualSprint: (sprinting: boolean) => void
  onAttack: () => void
}

export const GameUI: React.FC<GameUIProps> = ({
  activeZone,
  activeHouse,
  activeNpc,
  playerPos,
  playerRotation,
  gemCount,
  totalGems,
  collectedIds,
  hunts,
  quests,
  housesVisited,
  totalHouses,
  npcsTalked,
  totalNpcs,
  quality,
  onQualityChange,
  character,
  onCharacterChange,
  onOpenZone,
  onOpenHouse,
  onOpenNpc,
  onTeleport,
  onVirtualMove,
  onVirtualJump,
  onVirtualSprint,
  onAttack,
}) => {
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCharacters, setShowCharacters] = useState(false)
  const [isAudioMuted, setIsAudioMuted] = useState(isMuted)
  const [isSprintActive, setIsSprintActive] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  // Keep the speaker icon in sync with the shared audio state.
  useEffect(() => subscribeMuted(setIsAudioMuted), [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    } catch {
      /* ignore */
    }
  }
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {
      /* ignore */
    }
  }

  // Screen Orientation API — not in every TS lib, and unsupported on iOS Safari.
  const orientation = (
    screen as unknown as {
      orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void }
    }
  ).orientation

  const lockLandscape = async () => {
    try {
      if (orientation?.lock) {
        await orientation.lock('landscape')
        setIsLandscape(true)
      }
    } catch {
      /* unsupported or rejected */
    }
  }
  const unlockLandscape = () => {
    try {
      orientation?.unlock?.()
    } catch {
      /* ignore */
    }
    setIsLandscape(false)
  }

  // One-tap "Landscape": enter fullscreen, then lock the screen orientation.
  const enterLandscapeFullscreen = async () => {
    await enterFullscreen()
    await lockLandscape()
  }
  const exitLandscapeFullscreen = async () => {
    unlockLandscape()
    await exitFullscreen()
  }

  const toggleLandscapeFullscreen = () => {
    if (document.fullscreenElement) exitLandscapeFullscreen()
    else enterLandscapeFullscreen()
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) exitLandscapeFullscreen()
    else enterFullscreen()
  }

  const toggleLandscape = () => {
    if (isLandscape) unlockLandscape()
    else enterLandscapeFullscreen()
  }

  const openSettingsPanel = () => {
    const next = !showSettings
    setShowSettings(next)
    setShowHelp(false)
    setShowCharacters(false)
    if (next) sfx.uiOpen()
    else sfx.uiClose()
  }
  const openHelpPanel = () => {
    const next = !showHelp
    setShowHelp(next)
    setShowSettings(false)
    setShowCharacters(false)
    if (next) sfx.uiOpen()
    else sfx.uiClose()
  }
  const openCharactersPanel = () => {
    const next = !showCharacters
    setShowCharacters(next)
    setShowSettings(false)
    setShowHelp(false)
    if (next) sfx.uiOpen()
    else sfx.uiClose()
  }

  const toggleAudio = () => {
    const next = !isAudioMuted
    setMuted(next)
    if (!next) sfx.confirm()
  }

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
        <div className="flex flex-col items-start gap-2 min-w-0">
        <div className={`flex items-center gap-2.5 sm:gap-3 ${panel} px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl`}>
          <div className="relative">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-500" />
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-500 absolute inset-0 animate-ping opacity-75" />
          </div>
          <div>
            <h1 className="text-xs sm:text-base font-black tracking-wide text-slate-900 flex items-center gap-1.5">
              MUAMMAR RIZAL{' '}
              <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
                DUNIA RPG
              </span>
              <span
                className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-sm"
                title="Berjalan di VPS"
              >
                <Server className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                VPS
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-600 hidden md:block">
              Portfolio Dunia Terbuka • Jelajah, Lompat, dan Intip Karya Gw
            </p>
          </div>
        </div>

          {/* Compact radar under the name — mobile only */}
          <div className="md:hidden pointer-events-auto hud-radar-mobile">
            <Minimap playerPos={playerPos} playerRotation={playerRotation} onTeleport={onTeleport} size={86} collectedIds={collectedIds} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl ${panel} text-xs font-bold text-amber-600`}>
            <Gem className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 animate-bounce" />
            <span>
              {gemCount}/{totalGems}
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl ${panel} text-xs font-bold text-rose-600`}>
            <Sword className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
            <span>{hunts}</span>
          </div>

          <button
            onClick={openCharactersPanel}
            className={`${iconBtn} flex items-center gap-1.5 ${showCharacters ? 'ring-2 ring-blue-400 text-slate-900' : ''}`}
            title={`Ganti karakter — sekarang: ${character.name}`}
          >
            <UserRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline max-w-[7rem] truncate text-[11px] font-bold">{character.name}</span>
          </button>

          <button onClick={toggleAudio} className={iconBtn} title={isAudioMuted ? 'Nyalakan SFX' : 'Matikan SFX'}>
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />}
          </button>

          <button onClick={openSettingsPanel} className={iconBtn} title="Pengaturan">
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button onClick={openHelpPanel} className={iconBtn} title="Kontrol & Panduan">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={toggleLandscapeFullscreen}
            className={`p-2 sm:p-2.5 rounded-xl transition cursor-pointer ${
              isLandscape || isFullscreen
                ? 'bg-blue-600 text-white border border-blue-500 shadow-lg'
                : 'bg-white/85 backdrop-blur-md border border-white/70 shadow-lg shadow-slate-900/5 text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
            title={
              isLandscape
                ? 'Mode Lanskap: AKTIF — layar penuh + kunci lanskap'
                : 'Mode Lanskap — layar penuh + kunci lanskap'
            }
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* 2. MIDDLE: QUEST LOG (LEFT) & MINIMAP (RIGHT) */}
      <div className="flex justify-between items-start pointer-events-none mt-2">
        <div className="pointer-events-auto hud-short-hide">
          <QuestTracker
            quests={quests}
            gemsCollected={gemCount}
            totalGems={totalGems}
            housesVisited={housesVisited}
            totalHouses={totalHouses}
            npcsTalked={npcsTalked}
            totalNpcs={totalNpcs}
          />
        </div>
        <div className="pointer-events-auto hidden md:block hud-short-hide">
          <Minimap playerPos={playerPos} playerRotation={playerRotation} onTeleport={onTeleport} collectedIds={collectedIds} />
        </div>
      </div>

      {/* Character picker */}
      {showCharacters && (
        <CharacterPicker
          currentId={character.id}
          onSelect={(id) => {
            onCharacterChange(id)
            setShowCharacters(false)
          }}
          onClose={() => setShowCharacters(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="pointer-events-auto absolute top-16 sm:top-20 right-3 md:right-6 w-[19rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-7rem)] overflow-y-auto p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/70 shadow-2xl text-xs space-y-4 z-50 animate-in fade-in">
          <div className="flex justify-between items-center text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
            <span>⚙️ Grafis & Pengaturan</span>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">✕</button>
          </div>

          <div className="space-y-2.5">
            <label className="text-slate-500 block">Kamera & Tampilan</label>

            <button
              onClick={toggleLandscape}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <Smartphone className={`w-4 h-4 ${isLandscape ? 'text-blue-600' : 'text-slate-400'}`} />
                Kunci Lanskap
              </span>
              <Switch on={isLandscape} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-blue-600" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                )}
                Layar Penuh
              </span>
              <Switch on={isFullscreen} />
            </button>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-3">
            <div>
              <label className="text-slate-500 block mb-1">Kualitas Visual</label>
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
                  Hemat Baterai
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2">
            Dioptimalkan untuk rendering WebGL real-time yang lancar di HP & desktop.
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="pointer-events-auto absolute top-16 sm:top-20 right-3 md:right-6 w-80 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-7rem)] overflow-y-auto p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/70 shadow-2xl text-xs space-y-3.5 z-50 animate-in fade-in">
          <div className="flex justify-between items-center text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
            <span>🎮 Panduan Kontrol Petualangan</span>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">✕</button>
          </div>
          <div className="space-y-2.5 text-slate-600">
            <div className="flex justify-between items-center">
              <span>Gerak Karakter</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">W A S D / Analog Kiri</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Lompat</span>
              <span className="font-mono bg-amber-50 px-2 py-0.5 rounded text-amber-700 border border-amber-200">Spasi / LOMPAT</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Lari Cepat</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">Shift / LARI</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Putar Kamera</span>
              <span className="font-mono bg-cyan-50 px-2 py-0.5 rounded text-cyan-700 border border-cyan-200">Drag Mouse / Layar</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Interaksi / Buka Zona</span>
              <span className="font-mono bg-blue-50 px-2 py-0.5 rounded text-blue-700 border border-blue-200">E / BUKA</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Serang</span>
              <span className="font-mono bg-rose-50 px-2 py-0.5 rounded text-rose-700 border border-rose-200">F / SERANG</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Ngobrol dengan Warga</span>
              <span className="font-mono bg-emerald-50 px-2 py-0.5 rounded text-emerald-700 border border-emerald-200">Dekati + E</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Mode Lanskap</span>
              <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded text-indigo-700 border border-indigo-200">📱 Layar Penuh + Kunci Lanskap</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-200 pt-2 leading-relaxed">
            ☀️ Siang cerah, rumput bergoyang, dan satwa liar berkeliaran. Kumpulkan ke-16 kristal energi untuk jadi <b>Master Pulau</b> — atau berburu hewan buat tambah skor! 🗡️
            Singgah ke 9 rumah warga yang tersebar di 3 dusun buat intip konten portfolio & cerita kecil. 🏘️
          </p>
        </div>
      )}

      {/* 3. CENTER INTERACTION PROMPT */}
      {activeNpc ? (
        <div className="self-center pointer-events-auto animate-bounce mb-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenNpc(activeNpc)
            }}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/90 hover:bg-white border-2 text-slate-900 font-bold shadow-xl backdrop-blur-md transition transform hover:scale-105 cursor-pointer touch-none"
            style={{ borderColor: activeNpc.accent, boxShadow: `0 0 25px ${activeNpc.accent}60` }}
          >
            <MessageSquare className="w-4 h-4" style={{ color: activeNpc.accent }} />
            <span>Ngobrol dengan {activeNpc.name}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">[E]</span>
          </button>
        </div>
      ) : activeZone ? (
        <div className="self-center pointer-events-auto animate-bounce mb-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenZone(activeZone)
            }}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/90 hover:bg-white border-2 text-slate-900 font-bold shadow-xl backdrop-blur-md transition transform hover:scale-105 cursor-pointer touch-none"
            style={{ borderColor: activeZone.color, boxShadow: `0 0 25px ${activeZone.color}60` }}
          >
            <span className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: activeZone.color }} />
            <span>Buka {activeZone.title}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">[E]</span>
          </button>
        </div>
      ) : activeHouse ? (
        <div className="self-center pointer-events-auto animate-bounce mb-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenHouse(activeHouse)
            }}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/90 hover:bg-white border-2 text-slate-900 font-bold shadow-xl backdrop-blur-md transition transform hover:scale-105 cursor-pointer touch-none"
            style={{ borderColor: activeHouse.color, boxShadow: `0 0 25px ${activeHouse.color}60` }}
          >
            <Home className="w-4 h-4" style={{ color: activeHouse.color }} />
            <span>Kunjungi {activeHouse.name}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">[E]</span>
          </button>
        </div>
      ) : null}

      {/* 4. BOTTOM BAR */}
      <footer className="flex flex-col gap-3 pointer-events-auto">
        <div className={`hidden sm:flex self-start items-center gap-1.5 p-1.5 rounded-2xl ${panel} overflow-x-auto max-w-full hud-short-hide`}>
          <div className="px-2 text-slate-500 text-xs font-semibold flex items-center gap-1 shrink-0">
            <Compass className="w-3.5 h-3.5 text-blue-600" /> Perjalanan Cepat:
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
        <div className="flex md:hidden items-end justify-between w-full pb-2 px-1 hud-mobile-controls">
          <div className="touch-none">
            <VirtualJoystick onMove={onVirtualMove} />
          </div>

          <div className="flex flex-col items-end gap-2.5 touch-none">
            <div className="flex items-center gap-2">
              {activeNpc ? (
                <button
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpenNpc(activeNpc)
                  }}
                  className="w-13 h-13 rounded-full flex flex-col items-center justify-center font-black shadow-lg border-2 transition active:scale-95 animate-bounce touch-none"
                  style={{ backgroundColor: `${activeNpc.accent}dd`, borderColor: '#ffffff', color: '#ffffff', boxShadow: `0 0 16px ${activeNpc.accent}` }}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-[8px] tracking-tight">NGOBROL</span>
                </button>
              ) : activeZone ? (
                <button
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpenZone(activeZone)
                  }}
                  className="w-13 h-13 rounded-full flex flex-col items-center justify-center font-black shadow-lg border-2 transition active:scale-95 animate-bounce touch-none"
                  style={{ backgroundColor: `${activeZone.color}dd`, borderColor: '#ffffff', color: '#ffffff', boxShadow: `0 0 16px ${activeZone.color}` }}
                >
                  <Hand className="w-5 h-5" />
                  <span className="text-[8px] tracking-tight">BUKA</span>
                </button>
              ) : activeHouse ? (
                <button
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpenHouse(activeHouse)
                  }}
                  className="w-13 h-13 rounded-full flex flex-col items-center justify-center font-black shadow-lg border-2 transition active:scale-95 animate-bounce touch-none"
                  style={{ backgroundColor: `${activeHouse.color}dd`, borderColor: '#ffffff', color: '#ffffff', boxShadow: `0 0 16px ${activeHouse.color}` }}
                >
                  <Home className="w-5 h-5" />
                  <span className="text-[8px] tracking-tight">MASUK</span>
                </button>
              ) : null}

              <button
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleMobileSprint()
                }}
                className={`w-13 h-13 rounded-full flex flex-col items-center justify-center font-bold shadow-lg border transition active:scale-95 touch-none ${
                  isSprintActive
                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 border-cyan-300 text-white shadow-cyan-500/40 ring-2 ring-cyan-400'
                    : 'bg-white/85 border-white/70 text-slate-600'
                }`}
              >
                <Zap className={`w-5 h-5 ${isSprintActive ? 'text-yellow-300 fill-yellow-300 animate-pulse' : ''}`} />
                <span className="text-[8px] tracking-tight">LARI</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onAttack()
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 active:from-rose-600 active:to-red-700 flex flex-col items-center justify-center text-white font-black shadow-xl border-2 border-white/70 active:scale-95 transition touch-none select-none"
              >
                <Sword className="w-6 h-6 stroke-[2.5]" />
                <span className="text-[8px] font-mono tracking-tighter -mt-0.5">SERANG</span>
              </button>

              <button
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onVirtualJump()
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 active:from-amber-500 active:to-orange-600 flex flex-col items-center justify-center text-white font-black shadow-xl border-2 border-white/70 active:scale-95 transition touch-none select-none"
              >
                <ArrowUp className="w-7 h-7 stroke-[3]" />
                <span className="text-[9px] font-mono tracking-tighter -mt-1">LOMPAT</span>
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP HINT */}
        <div className={`hidden md:flex items-center justify-between text-xs text-slate-500 ${panel} px-3.5 py-2 rounded-xl hud-short-hide`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              <b className="text-slate-700">WASD</b> Gerak • <b className="text-slate-700">SPASI</b> Lompat • <b className="text-slate-700">SHIFT</b> Lari • <b className="text-slate-700">E</b> Buka Zona • <b className="text-slate-700">F</b> Serang • <b className="text-slate-700">Drag</b> Putar Kamera
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Muammar Rizal © 2026</span>
        </div>
      </footer>
    </div>
  )
}
