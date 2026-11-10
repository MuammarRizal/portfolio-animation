import React from 'react'
import { Check, X } from 'lucide-react'
import { CHARACTER_PRESETS, type CharacterPreset } from '../game/characters'

/** Tiny CSS stand-in for the 3D rig so players can preview a hero at a glance. */
const HeroPreview: React.FC<{ preset: CharacterPreset; size?: number }> = ({ preset, size = 72 }) => {
  const unit = size / 72
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size * 1.25 }}
      aria-hidden
    >
      {/* shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{ bottom: 0, width: 30 * unit, height: 8 * unit, background: 'rgba(15,23,42,0.25)' }}
      />
      {/* legs */}
      <div className="absolute left-1/2 -translate-x-1/2 flex gap-[3px]" style={{ bottom: 5 * unit }}>
        {[0, 1].map((i) => (
          <div key={i} className="rounded-[2px]" style={{ width: 11 * unit, height: 22 * unit, background: preset.pants }}>
            <div
              className="mt-auto rounded-b-[2px]"
              style={{ width: 12 * unit, height: 7 * unit, background: preset.boots, marginLeft: -0.5 * unit }}
            />
          </div>
        ))}
      </div>
      {/* torso */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[4px]"
        style={{ bottom: 25 * unit, width: 34 * unit, height: 30 * unit, background: preset.top }}
      >
        {/* chest core */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-[2px]"
          style={{ top: 6 * unit, width: 14 * unit, height: 7 * unit, background: preset.glow, boxShadow: `0 0 6px ${preset.glow}` }}
        />
        {/* belt */}
        <div className="absolute left-0 right-0" style={{ bottom: 3 * unit, height: 5 * unit, background: preset.accent }} />
      </div>
      {/* head */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[4px]"
        style={{ bottom: 55 * unit, width: 22 * unit, height: 22 * unit, background: preset.skin }}
      >
        <div className="absolute inset-x-0 top-0 rounded-t-[4px]" style={{ height: 8 * unit, background: preset.hair }} />
        {/* eyes */}
        <div className="absolute" style={{ top: 11 * unit, left: 4 * unit, width: 4 * unit, height: 4 * unit, background: '#0f172a' }} />
        <div className="absolute" style={{ top: 11 * unit, right: 4 * unit, width: 4 * unit, height: 4 * unit, background: '#0f172a' }} />
      </div>
      {/* accessory accent */}
      {preset.accessory === 'hat' && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: 74 * unit,
            width: 0,
            height: 0,
            borderLeft: `${9 * unit}px solid transparent`,
            borderRight: `${9 * unit}px solid transparent`,
            borderBottom: `${16 * unit}px solid ${preset.accessoryColor}`,
          }}
        />
      )}
      {preset.accessory === 'helm' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-[3px]"
          style={{ bottom: 60 * unit, width: 26 * unit, height: 15 * unit, background: preset.accessoryColor }}
        />
      )}
      {preset.accessory === 'headband' && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: 61 * unit, width: 24 * unit, height: 4 * unit, background: preset.accessoryColor }}
        />
      )}
      {preset.accessory === 'scarf' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-[2px]"
          style={{ bottom: 50 * unit, width: 24 * unit, height: 5 * unit, background: preset.accessoryColor }}
        />
      )}
      {preset.accessory === 'cape' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-[3px]"
          style={{ bottom: 6 * unit, width: 38 * unit, height: 48 * unit, background: preset.accessoryColor, zIndex: -1 }}
        />
      )}
    </div>
  )
}

interface CharacterPickerProps {
  currentId: string
  onSelect: (id: string) => void
  onClose: () => void
}

export const CharacterPicker: React.FC<CharacterPickerProps> = ({ currentId, onSelect, onClose }) => {
  return (
    <div className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-md border border-white/70 shadow-2xl animate-in fade-in">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-white/95">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              🧑 Pilih Karakter
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Ganti penampilan pahlawanmu kapan saja — langsung berubah tanpa reload.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-5">
          {CHARACTER_PRESETS.map((preset) => {
            const active = preset.id === currentId
            return (
              <button
                key={preset.id}
                onClick={() => onSelect(preset.id)}
                className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition cursor-pointer ${
                  active
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400/60'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex h-[100px] w-[80px] items-end justify-center rounded-xl bg-gradient-to-b from-sky-100 to-emerald-100 border border-white/80 overflow-hidden shrink-0">
                  <HeroPreview preset={preset} size={64} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{preset.emoji}</span>
                    <span className="text-sm font-bold text-slate-900 truncate">{preset.name}</span>
                    {active && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mt-0.5">
                    {preset.title}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-3">{preset.desc}</p>

                  <div className="flex items-center gap-1 mt-2">
                    {[preset.skin, preset.hair, preset.top, preset.accent, preset.pants, preset.glow].map((c, i) => (
                      <span key={i} className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
