import React from 'react'
import { X, Home, Sparkles, Gamepad2 } from 'lucide-react'
import type { HouseData } from '../data/portfolio'

interface HousePanelProps {
  house: HouseData | null
  onClose: () => void
}

/** Mini-zone panel: opens when the player knocks at a village house. */
export const HousePanel: React.FC<HousePanelProps> = ({ house, onClose }) => {
  if (!house) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
      onPointerDown={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-md border border-white/70 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-5 sm:px-7 pt-6 pb-5"
          style={{ background: `linear-gradient(135deg, ${house.color}22, transparent)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: house.color }}
            >
              <Home className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold tracking-widest text-slate-400">MINI-ZONA</span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: house.kind === 'portfolio' ? house.color : '#64748b' }}
                >
                  {house.kind === 'portfolio' ? 'PORTFOLIO' : 'WARGA'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">{house.name}</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">{house.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="px-5 sm:px-7 pb-6 space-y-3">
          {house.sections.map((s, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base leading-none">{s.icon}</span>
                <h3 className="font-bold text-sm text-slate-900">{s.heading}</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{s.body}</p>
              {s.bullets && s.bullets.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {s.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: house.color }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-400">
            {house.kind === 'portfolio' ? (
              <>
                <Sparkles className="w-3 h-3" /> Rumah ini bagian dari portfolio interaktif
              </>
            ) : (
              <>
                <Gamepad2 className="w-3 h-3" /> Cerita kecil dari dunia gw
              </>
            )}
          </div>

          <div className="text-center text-[10px] text-slate-400">
            Tekan <b className="text-slate-600">ESC</b> atau klik di luar untuk lanjut jelajah
          </div>
        </div>
      </div>
    </div>
  )
}
