// Procedural WebAudio sound effects.
//
// Every sound is synthesised on the fly — there are no .mp3/.ogg files and no
// network requests, so the site keeps working fully offline. The AudioContext is
// created lazily on the first user gesture to satisfy browser autoplay policy.

type MutedListener = (muted: boolean) => void

const MASTER_VOLUME = 0.7

let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambientGain: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let muted = true

const listeners = new Set<MutedListener>()

function AudioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

function ensureContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = AudioCtor()
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  master = ctx.createGain()
  master.gain.value = muted ? 0 : MASTER_VOLUME
  master.connect(ctx.destination)
  return ctx
}

/** Called from any user gesture: creates/resumes the context and starts ambience. */
export function unlockAudio(): void {
  const c = ensureContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  startAmbient()
}

/** Install one-shot gesture listeners so audio is armed before it is needed. */
export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return
  const unlock = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock)
  window.addEventListener('touchstart', unlock, { passive: true })
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(next: boolean): void {
  muted = next
  if (!next) {
    unlockAudio()
  }
  if (ctx && master) {
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t)
    master.gain.exponentialRampToValueAtTime(next ? 0.0001 : MASTER_VOLUME, t + 0.15)
  }
  listeners.forEach((fn) => fn(muted))
}

export function subscribeMuted(fn: MutedListener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// ---- low level primitives ----

function noiseBufferFor(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const len = Math.floor(c.sampleRate * 0.5)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buf
  return buf
}

interface ToneOpts {
  freq: number
  /** Glide target frequency. */
  to?: number
  type?: OscillatorType
  dur?: number
  gain?: number
  delay?: number
}

function tone({ freq, to, type = 'sine', dur = 0.18, gain = 0.3, delay = 0 }: ToneOpts): void {
  if (muted || !ctx || !master) return
  const c = ctx
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(Math.max(1, freq), t0)
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur)
  const peak = Math.max(0.0001, gain)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur * 0.3))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

interface NoiseOpts {
  dur?: number
  gain?: number
  filter?: number
  /** Sweep the filter down/up over the duration. */
  filterTo?: number
  q?: number
  type?: BiquadFilterType
  delay?: number
}

function noise(opts: NoiseOpts = {}): void {
  const { dur = 0.2, gain = 0.25, filter = 1200, filterTo, q = 0.7, type = 'lowpass', delay = 0 } = opts
  if (muted || !ctx || !master) return
  const c = ctx
  const t0 = c.currentTime + delay
  const src = c.createBufferSource()
  src.buffer = noiseBufferFor(c)
  const bq = c.createBiquadFilter()
  bq.type = type
  bq.frequency.setValueAtTime(Math.max(20, filter), t0)
  if (filterTo !== undefined) bq.frequency.exponentialRampToValueAtTime(Math.max(20, filterTo), t0 + dur)
  bq.Q.value = q
  const g = c.createGain()
  const peak = Math.max(0.0001, gain)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.015, dur * 0.25))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bq).connect(g).connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.05)
}

/** Soft looping wind bed, started once the context is running. */
function startAmbient(): void {
  if (!ctx || !master || ambientGain) return
  const c = ctx
  const src = c.createBufferSource()
  src.buffer = noiseBufferFor(c)
  src.loop = true
  const bq = c.createBiquadFilter()
  bq.type = 'lowpass'
  bq.frequency.value = 420
  const g = c.createGain()
  g.gain.value = 0.02
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.08
  const lfoGain = c.createGain()
  lfoGain.gain.value = 0.011
  lfo.connect(lfoGain).connect(g.gain)
  src.connect(bq).connect(g).connect(master)
  src.start()
  lfo.start()
  ambientGain = g
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

// ---- game sound effects ----

export const sfx = {
  jump(): void {
    tone({ freq: 300, to: 640, type: 'triangle', dur: 0.16, gain: 0.2 })
  },

  land(): void {
    noise({ dur: 0.16, gain: 0.26, filter: 900, filterTo: 220 })
    tone({ freq: 150, to: 70, type: 'sine', dur: 0.16, gain: 0.2 })
  },

  swing(): void {
    noise({ dur: 0.22, gain: 0.2, filter: 3200, filterTo: 700, type: 'bandpass', q: 0.9 })
  },

  hit(): void {
    noise({ dur: 0.18, gain: 0.3, filter: 1100, filterTo: 180 })
    tone({ freq: 240, to: 90, type: 'square', dur: 0.12, gain: 0.12 })
  },

  gem(): void {
    tone({ freq: 880, type: 'sine', dur: 0.13, gain: 0.18 })
    tone({ freq: 1320, type: 'sine', dur: 0.2, gain: 0.16, delay: 0.08 })
  },

  zone(): void {
    tone({ freq: 523.25, type: 'triangle', dur: 0.2, gain: 0.14 })
    tone({ freq: 659.25, type: 'triangle', dur: 0.2, gain: 0.13, delay: 0.1 })
    tone({ freq: 783.99, type: 'triangle', dur: 0.28, gain: 0.12, delay: 0.2 })
  },

  /** Distance-attenuated chirp used when a villager waves hello. */
  greet(volume = 1): void {
    const v = clamp01(volume)
    if (v <= 0.02) return
    tone({ freq: 540, type: 'triangle', dur: 0.1, gain: 0.15 * v })
    tone({ freq: 720, type: 'triangle', dur: 0.14, gain: 0.13 * v, delay: 0.09 })
  },

  uiOpen(): void {
    tone({ freq: 420, to: 660, type: 'sine', dur: 0.12, gain: 0.12 })
  },

  uiClose(): void {
    tone({ freq: 560, to: 320, type: 'sine', dur: 0.12, gain: 0.11 })
  },

  confirm(): void {
    tone({ freq: 660, to: 990, type: 'triangle', dur: 0.16, gain: 0.16 })
  },
}
