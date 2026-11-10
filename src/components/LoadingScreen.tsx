import React, { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

interface LoadingScreenProps {
  /** Set true once the 3D scene has actually rendered its first frames. */
  sceneReady: boolean
  /** Called after the fade-out finishes so the parent can unmount this screen. */
  onDone: () => void
}

/** Minimum time the loader stays up, so a fast machine doesn't get a violent flash. */
const MIN_VISIBLE_MS = 1200
/** Absolute safety net: never trap the user behind the loader. */
const HARD_TIMEOUT_MS = 12000
const FADE_MS = 750

const statusFor = (p: number): string => {
  if (p < 25) return 'Menyiapkan dunia 3D...'
  if (p < 50) return 'Menanam rumput & pepohonan...'
  if (p < 70) return 'Membangun menara & gerbang...'
  if (p < 88) return 'Memanggil penghuni hutan...'
  if (p < 99) return 'Menajamkan pedang...'
  return 'Hampir siap...'
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ sceneReady, onDone }) => {
  // Real asset progress (THREE.DefaultLoadingManager). With a fully procedural
  // scene this sits at 100 immediately, but it keeps the loader honest if
  // textures/models are added later.
  const { active, progress: assetProgress, total } = useProgress()
  const assetsDone = !active && (total === 0 || assetProgress >= 100)

  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [forced, setForced] = useState(false)

  const startRef = useRef(0)
  const finishedRef = useRef(false)

  const gateOpen = (sceneReady && assetsDone) || forced

  // Stamp the mount time (kept out of render to stay React-pure).
  useEffect(() => {
    startRef.current = performance.now()
  }, [])

  // Smooth, decelerating creep toward the cap. Holds at 88% until the scene is
  // really ready, then completes.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      setProgress((p) => {
        const cap = gateOpen ? 100 : 88
        if (p >= cap) return p
        const speed = p < 40 ? 46 : p < 70 ? 26 : 13
        return Math.min(cap, p + speed * dt)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [gateOpen])

  // Hard timeout fallback.
  useEffect(() => {
    const id = window.setTimeout(() => setForced(true), HARD_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [])

  // Finish: hold for the minimum duration, then fade out and hand off.
  useEffect(() => {
    if (finishedRef.current || !gateOpen || progress < 99.5) return
    const elapsed = performance.now() - startRef.current
    const hold = Math.max(0, MIN_VISIBLE_MS - elapsed)
    const id = window.setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      setLeaving(true)
      window.setTimeout(onDone, FADE_MS)
    }, hold)
    return () => window.clearTimeout(id)
  }, [gateOpen, progress, onDone])

  const pct = Math.round(progress)

  return (
    <div
      aria-hidden={leaving}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#cfe9ff] via-[#a9d8f5] to-[#7cb8e6] transition-opacity duration-700 ease-out ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* soft radial glow + grid backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.85),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(#0f172a_1px,transparent_1px),linear-gradient(90deg,#0f172a_1px,transparent_1px)] [background-size:46px_46px]" />

      <div className="relative flex flex-col items-center px-6">
        {/* Monogram: MR */}
        <div className="relative">
          <span className="mr-monogram block text-[clamp(4.5rem,26vw,11rem)] font-black leading-none tracking-[0.08em] text-transparent bg-clip-text bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700 drop-shadow-[0_10px_30px_rgba(30,64,175,0.35)]">
            MR
          </span>
          <span className="mr-shimmer pointer-events-none absolute inset-0 block bg-clip-text text-[clamp(4.5rem,26vw,11rem)] font-black leading-none tracking-[0.08em] text-transparent bg-gradient-to-r from-transparent via-white to-transparent">
            MR
          </span>
        </div>

        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.42em] text-blue-900/80 sm:text-xs">
          Muammar Rizal
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-blue-900/55 sm:text-[11px]">
          Portfolio RPG 3D
        </p>

        {/* Progress */}
        <div className="mt-10 w-[min(82vw,340px)]">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-medium tracking-wide text-blue-900/75 sm:text-[11px]">
            <span>{statusFor(progress)}</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
        </div>
      </div>

      <p className="absolute bottom-6 text-[10px] uppercase tracking-[0.3em] text-blue-900/40">Tap / scroll untuk mulai</p>
    </div>
  )
}
