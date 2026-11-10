// Playable hero presets. Each preset points at a real rigged GLB (see
// src/game/models.ts); the colour fields are still used by the 2D character
// picker swatches, so a preset keeps both its model key and its palette.

import type { ModelKey } from './models'

export type HairStyle = 'short' | 'spiky' | 'long' | 'bun'
export type AccessoryKind = 'cape' | 'hat' | 'headband' | 'scarf' | 'helm'

export interface CharacterPreset {
  id: string
  name: string
  title: string
  emoji: string
  desc: string
  /** Which rigged GLB to render for this hero. */
  model: ModelKey
  /** Horizontal body width multiplier (0.9 – 1.1). */
  build: number
  skin: string
  hair: string
  hairStyle: HairStyle
  top: string
  accent: string
  pants: string
  boots: string
  /** Emissive chest core / blade glow. */
  glow: string
  accessory: AccessoryKind
  accessoryColor: string
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'ksatria',
    name: 'Ksatria Nusantara',
    title: 'Penjaga Gerbang',
    emoji: '🛡️',
    desc: 'Baju besi baja, jubah merah menyala, dan pedang energi biru. Seimbang untuk semua medan.',
    model: 'knight',
    build: 1.08,
    skin: '#f2c39b',
    hair: '#1f2937',
    hairStyle: 'short',
    top: '#1e293b',
    accent: '#3b82f6',
    pants: '#0f172a',
    boots: '#475569',
    glow: '#38bdf8',
    accessory: 'cape',
    accessoryColor: '#ef4444',
  },
  {
    id: 'penyihir',
    name: 'Penyihir Nexus',
    title: 'Peramu Sihir',
    emoji: '🧙',
    desc: 'Jubah ungu berkilau dengan topi lancip dan inti sihir yang berpendar terang.',
    model: 'mage',
    build: 0.96,
    skin: '#e8b48a',
    hair: '#f59e0b',
    hairStyle: 'long',
    top: '#6d28d9',
    accent: '#a855f7',
    pants: '#3b0764',
    boots: '#4c1d95',
    glow: '#e879f9',
    accessory: 'hat',
    accessoryColor: '#7c3aed',
  },
  {
    id: 'penjelajah',
    name: 'Penjelajah Rimba',
    title: 'Pelacak Jejak',
    emoji: '🏹',
    desc: 'Pakaian rimba hijau, ikat kepala merah, dan gaya rambut acak-acakan siap berlari.',
    model: 'rogueHooded',
    build: 1.0,
    skin: '#d9a06b',
    hair: '#78350f',
    hairStyle: 'spiky',
    top: '#166534',
    accent: '#22c55e',
    pants: '#14532d',
    boots: '#365314',
    glow: '#a3e635',
    accessory: 'headband',
    accessoryColor: '#dc2626',
  },
  {
    id: 'arkeolog',
    name: 'Arkeolog Senja',
    title: 'Peneliti Reruntuhan',
    emoji: '🏺',
    desc: 'Mantel cokelat gurun, syal biru, dan sanggul rapi. Ahli membaca prasasti kuno.',
    model: 'rogue',
    build: 1.02,
    skin: '#f0c8a0',
    hair: '#0f172a',
    hairStyle: 'bun',
    top: '#b45309',
    accent: '#f59e0b',
    pants: '#44403c',
    boots: '#78350f',
    glow: '#fbbf24',
    accessory: 'scarf',
    accessoryColor: '#38bdf8',
  },
  {
    id: 'penjaga',
    name: 'Penjaga Bayangan',
    title: 'Wali Kegelapan',
    emoji: '⚔️',
    desc: 'Armor hitam pekat dengan helm bertanduk dan aura inti berwarna indigo.',
    model: 'barbarian',
    build: 1.05,
    skin: '#c98a5b',
    hair: '#111827',
    hairStyle: 'short',
    top: '#111827',
    accent: '#6366f1',
    pants: '#030712',
    boots: '#1e1b4b',
    glow: '#818cf8',
    accessory: 'helm',
    accessoryColor: '#312e81',
  },
]

export const DEFAULT_CHARACTER_ID = 'ksatria'

export function getCharacter(id: string | null | undefined): CharacterPreset {
  return CHARACTER_PRESETS.find((c) => c.id === id) ?? CHARACTER_PRESETS[0]
}
