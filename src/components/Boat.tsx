import React, { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { DOCKS, pierAt, type Dock, type PlayerState } from '../game/world'
import { waveHeight } from '../game/ocean'
import { WorldLabel } from './WorldLabel'

/** What the hero can do with the ferry right now. */
export interface DockPrompt {
  kind: 'board' | 'disembark'
  dock: Dock
}

/** Seconds the ferry takes to cross between the two piers. */
const RIDE_TIME = 3.2
/** Height of the deck the passenger stands on, above the waterline. */
const DECK_Y = 0.78
/** Aft offset of the passenger so they clear the wheelhouse. */
const DECK_Z = -0.55
/** Local Z of the stern — where the hull ends and the gangplank hinges. */
const STERN_Z = -1.8

// ---------------------------------------------------------------------------
// Paint & parts (shared meshes, built once)
// ---------------------------------------------------------------------------

const HULL_MAT = new THREE.MeshStandardMaterial({ color: '#123a63', roughness: 0.8, flatShading: true })
const BOOT_MAT = new THREE.MeshStandardMaterial({ color: '#c8442f', roughness: 0.75 })
const SIDE_MAT = new THREE.MeshStandardMaterial({ color: '#eef2f7', roughness: 0.65, flatShading: true })
const DECK_MAT = new THREE.MeshStandardMaterial({ color: '#c9a06a', roughness: 0.85, flatShading: true })
const TRIM_MAT = new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.8, flatShading: true })
const CABIN_MAT = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 })
const GLASS_MAT = new THREE.MeshStandardMaterial({
  color: '#12324a',
  emissive: '#2d6d99',
  emissiveIntensity: 0.35,
  roughness: 0.25,
})
const FUNNEL_MAT = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.6 })
const FUNNEL_BAND_MAT = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 })
const FUNNEL_TOP_MAT = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.8 })
const STEEL_MAT = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.45, metalness: 0.35 })
const LIFE_MAT = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.65 })
const FLAG_MAT = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.7, side: THREE.DoubleSide })
const LAMP_MAT = new THREE.MeshStandardMaterial({ color: '#fde68a', emissive: '#f59e0b', emissiveIntensity: 1.6 })
const FOAM_MAT = new THREE.MeshBasicMaterial({
  color: '#eaf7ff',
  transparent: true,
  opacity: 0,
  depthWrite: false,
})

/**
 * Square-based prow, aligned flush with the box hull: a 4-sided cone rotated so
 * its base sits across the hull and its point drives forward (+Z).
 */
const BOW_GEO = (() => {
  const g = new THREE.ConeGeometry(1.27, 1.9, 4)
  g.rotateY(Math.PI / 4)
  g.rotateX(Math.PI / 2)
  g.scale(1, 0.5, 1)
  g.translate(0, 0.34, 2.55)
  return g
})()

/** Live ferry state — mutated per frame, never React state. */
interface FerryState {
  x: number
  z: number
  yaw: number
  /** Pier the ferry is moored at. */
  from: Dock
  /** Pier it is currently steaming towards, or null when parked. */
  to: Dock | null
  /** 0..1 progress of the current crossing. */
  travel: number
  sailing: boolean
}

/** Shortest-way interpolation between two angles. */
function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a
  while (d < -Math.PI) d += Math.PI * 2
  while (d > Math.PI) d -= Math.PI * 2
  return a + d * t
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/** "Dermaga Pulau Hijau" → "Pulau Hijau". */
function dockIsland(dock: Dock): string {
  return dock.name.replace(/^Dermaga\s+/, '')
}

/** Along-pier positions the side railings are posted at. */
const RAIL_POSTS = [-1.6, -1.2, -0.8, -0.4, 0, 0.4]

/** A low-poly motor ferry, built facing +Z: navy hull, white wheelhouse, funnel. */
const BoatHull: React.FC = () => (
  <group>
    {/* ---- hull below the waterline + prow ---- */}
    <mesh castShadow position={[0, -0.28, 0]}>
      <boxGeometry args={[1.7, 0.5, 3.4]} />
      <primitive object={HULL_MAT} attach="material" />
    </mesh>
    <mesh geometry={BOW_GEO}>
      <primitive object={HULL_MAT} attach="material" />
    </mesh>

    {/* ---- red boot stripe at the waterline ---- */}
    <mesh position={[0, 0.03, 0]}>
      <boxGeometry args={[1.79, 0.14, 3.5]} />
      <primitive object={BOOT_MAT} attach="material" />
    </mesh>

    {/* ---- freeboard / bulwark ---- */}
    <mesh castShadow position={[0, 0.42, 0]}>
      <boxGeometry args={[1.8, 0.5, 3.6]} />
      <primitive object={SIDE_MAT} attach="material" />
    </mesh>

    {/* ---- deck ---- */}
    <mesh position={[0, 0.72, 0]}>
      <boxGeometry args={[1.62, 0.12, 3.4]} />
      <primitive object={DECK_MAT} attach="material" />
    </mesh>

    {/* ---- gunwale caps ---- */}
    <mesh position={[-0.86, 0.7, 0]}>
      <boxGeometry args={[0.16, 0.1, 3.62]} />
      <primitive object={TRIM_MAT} attach="material" />
    </mesh>
    <mesh position={[0.86, 0.7, 0]}>
      <boxGeometry args={[0.16, 0.1, 3.62]} />
      <primitive object={TRIM_MAT} attach="material" />
    </mesh>

    {/* ---- transom (flat stern) ---- */}
    <mesh position={[0, 0.34, -1.87]}>
      <boxGeometry args={[1.8, 0.7, 0.14]} />
      <primitive object={SIDE_MAT} attach="material" />
    </mesh>

    {/* ---- wheelhouse near the bow ---- */}
    <mesh castShadow position={[0, 1.2, 1.0]}>
      <boxGeometry args={[1.3, 0.9, 1.0]} />
      <primitive object={CABIN_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 1.7, 1.0]}>
      <boxGeometry args={[1.5, 0.12, 1.16]} />
      <primitive object={SIDE_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 1.28, 1.51]}>
      <boxGeometry args={[0.95, 0.34, 0.06]} />
      <primitive object={GLASS_MAT} attach="material" />
    </mesh>
    <mesh position={[-0.66, 1.28, 1.0]}>
      <boxGeometry args={[0.06, 0.34, 0.72]} />
      <primitive object={GLASS_MAT} attach="material" />
    </mesh>
    <mesh position={[0.66, 1.28, 1.0]}>
      <boxGeometry args={[0.06, 0.34, 0.72]} />
      <primitive object={GLASS_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 1.95, 1.0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.44, 6]} />
      <primitive object={STEEL_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 2.2, 1.0]}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <primitive object={LAMP_MAT} attach="material" />
    </mesh>

    {/* ---- funnel astern of the wheelhouse ---- */}
    <mesh castShadow position={[0, 1.25, 0.25]}>
      <cylinderGeometry args={[0.15, 0.18, 0.8, 8]} />
      <primitive object={FUNNEL_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 1.42, 0.25]}>
      <cylinderGeometry args={[0.17, 0.17, 0.14, 8]} />
      <primitive object={FUNNEL_BAND_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 1.66, 0.25]}>
      <cylinderGeometry args={[0.18, 0.17, 0.08, 8]} />
      <primitive object={FUNNEL_TOP_MAT} attach="material" />
    </mesh>

    {/* ---- railings down both sides ---- */}
    {[-1, 1].map((side) => (
      <group key={side}>
        {RAIL_POSTS.map((z) => (
          <mesh key={z} position={[side * 0.83, 0.95, z]}>
            <boxGeometry args={[0.05, 0.36, 0.05]} />
            <primitive object={STEEL_MAT} attach="material" />
          </mesh>
        ))}
        <mesh position={[side * 0.83, 1.13, -0.6]}>
          <boxGeometry args={[0.06, 0.06, 2.2]} />
          <primitive object={STEEL_MAT} attach="material" />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 1.13, -1.7]}>
      <boxGeometry args={[1.7, 0.06, 0.06]} />
      <primitive object={STEEL_MAT} attach="material" />
    </mesh>

    {/* ---- passenger bench on the open aft deck ---- */}
    <mesh position={[0, 0.9, -1.35]}>
      <boxGeometry args={[1.3, 0.2, 0.42]} />
      <primitive object={TRIM_MAT} attach="material" />
    </mesh>

    {/* ---- life ring on the wheelhouse ---- */}
    <mesh position={[-0.72, 1.25, 0.95]} rotation={[0, Math.PI / 2, 0]}>
      <torusGeometry args={[0.17, 0.05, 6, 12]} />
      <primitive object={LIFE_MAT} attach="material" />
    </mesh>

    {/* ---- mast + pennant astern ---- */}
    <mesh position={[0, 1.75, -1.7]}>
      <cylinderGeometry args={[0.04, 0.06, 1.9, 6]} />
      <primitive object={TRIM_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 2.35, -1.62]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[0.75, 0.45]} />
      <primitive object={FLAG_MAT} attach="material" />
    </mesh>
  </group>
)

/** Foam V trailing the hull; fades in and out with the crossing. */
const Wake: React.FC<{ mat: THREE.Material }> = ({ mat }) => (
  <group position={[0, 0.06, -2.6]}>
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.6, 0, -1.4]} rotation={[-Math.PI / 2, 0, side * 0.5]}>
        <planeGeometry args={[0.5, 4.0]} />
        <primitive object={mat} attach="material" />
      </mesh>
    ))}
    <mesh position={[0, 0, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.2, 3.0]} />
      <primitive object={mat} attach="material" />
    </mesh>
  </group>
)

interface BoatProps {
  /** True while the hero is aboard (App flips this when they take the boat). */
  riding: boolean
  /** 'low' freezes the ocean shader, so the hull must freeze with it. */
  quality: 'high' | 'low'
  playerRef: React.MutableRefObject<PlayerState>
  onPromptChange: (prompt: DockPrompt | null) => void
  /** Fired once the ferry has tied up at the destination pier. */
  onArrive: (dock: Dock) => void
}

/**
 * The archipelago's ferry. It does not answer the helm: walk down a pier, press
 * [E] and it steams itself to the other island's pier. The hull rides the real
 * Gerstner surface (`waveHeight`) so it sits *in* the water, a hinged gangplank
 * rests on the pier while moored, and the passenger rides the open aft deck.
 */
export const Boat: React.FC<BoatProps> = ({ riding, quality, playerRef, onPromptChange, onArrive }) => {
  const groupRef = useRef<THREE.Group>(null!)
  const plankRef = useRef<THREE.Group>(null!)
  const promptId = useRef<string | null>(null)
  // Brief grace period after tying up so the "board" prompt does not reappear
  // the instant the passenger steps off.
  const cooldown = useRef(0)

  const ferry = useRef<FerryState>({
    from: DOCKS[0],
    x: DOCKS[0].boatX,
    z: DOCKS[0].boatZ,
    yaw: DOCKS[0].boatRot,
    to: null,
    travel: 0,
    sailing: false,
  })

  // Parked pier as React state so the floating label re-renders on arrival.
  const [parkedId, setParkedId] = useState(DOCKS[0].id)
  const parked = DOCKS.find((d) => d.id === parkedId) ?? DOCKS[0]
  const destination = DOCKS.find((d) => d.id !== parked.id) ?? DOCKS[0]
  const destIsland = useMemo(() => dockIsland(destination), [destination])

  const report = (prompt: DockPrompt | null) => {
    const key = prompt ? `${prompt.kind}:${prompt.dock.id}` : null
    if (key === promptId.current) return
    promptId.current = key
    onPromptChange(prompt)
  }

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.06)
    const t = quality === 'low' ? 0 : state.clock.elapsedTime
    const f = ferry.current

    // Board → start a crossing towards the opposite pier.
    if (riding && !f.sailing) {
      const dest = DOCKS.find((d) => d.id !== f.from.id)
      if (dest) {
        f.to = dest
        f.travel = 0
        f.sailing = true
      }
    }

    if (f.sailing && f.to) {
      f.travel = Math.min(1, f.travel + dt / RIDE_TIME)
      const e = smoothstep(f.travel)
      f.x = THREE.MathUtils.lerp(f.from.boatX, f.to.boatX, e)
      f.z = THREE.MathUtils.lerp(f.from.boatZ, f.to.boatZ, e)

      const heading = Math.atan2(f.to.boatX - f.from.boatX, f.to.boatZ - f.from.boatZ)
      // Swing out of the moor, hold the heading, then turn to moor at the far pier.
      const headingNow = lerpAngle(f.from.boatRot, heading, smoothstep(f.travel / 0.25))
      f.yaw = lerpAngle(headingNow, f.to.boatRot, smoothstep((f.travel - 0.6) / 0.4))

      if (f.travel >= 1) {
        f.from = f.to
        f.to = null
        f.sailing = false
        f.x = f.from.boatX
        f.z = f.from.boatZ
        f.yaw = f.from.boatRot
        setParkedId(f.from.id)
        cooldown.current = 2.5
        onArrive(f.from)
      }
    } else {
      f.x = f.from.boatX
      f.z = f.from.boatZ
      f.yaw = f.from.boatRot
    }

    // Ride the actual waves, plus a lazy roll.
    const surf = waveHeight(f.x, f.z, t)
    const bob = Math.sin(t * 1.7) * 0.13
    const g = groupRef.current
    if (g) {
      g.position.set(f.x, surf + 0.05 + bob, f.z)
      g.rotation.set(Math.sin(t * 1.1) * 0.035, f.yaw, Math.sin(t * 0.85) * 0.045)
    }

    // The gangplank lies on the pier when moored and swings up under way.
    if (plankRef.current) {
      const target = f.sailing ? 1.2 : 0.06
      plankRef.current.rotation.x = THREE.MathUtils.lerp(plankRef.current.rotation.x, target, dt * 4)
    }

    // Braking foam scales with how fast we are moving through the crossing.
    const speed = f.sailing ? Math.sin(Math.PI * f.travel) : 0
    FOAM_MAT.opacity = speed * 0.6

    // Publish the deck position so the hero (and camera) ride along.
    if (riding) {
      const cy = Math.cos(f.yaw)
      const sy = Math.sin(f.yaw)
      const p = playerRef.current.position
      p.set(f.x + DECK_Z * sy, surf + 0.05 + bob + DECK_Y, f.z + DECK_Z * cy)
      playerRef.current.rotation = f.yaw
      playerRef.current.sprinting = false
      playerRef.current.airborne = false
    }

    // Offer a ride whenever the hero is standing on the pier the ferry is at
    // (the gangplank counts — it is part of that pier's footprint).
    if (cooldown.current > 0) cooldown.current = Math.max(0, cooldown.current - dt)
    if (!riding && cooldown.current <= 0) {
      const p = playerRef.current.position
      const atPier = pierAt(p.x, p.z)?.id === f.from.id
      report(atPier ? { kind: 'board', dock: f.from } : null)
    } else {
      report(null)
    }
  })

  return (
    <group ref={groupRef} position={[DOCKS[0].boatX, 0, DOCKS[0].boatZ]}>
      <BoatHull />

      {/* hinged boarding gangplank over the stern */}
      <group ref={plankRef} position={[0, DECK_Y, STERN_Z]}>
        <mesh castShadow position={[0, -0.05, -1.3]}>
          <boxGeometry args={[1.6, 0.1, 2.6]} />
          <primitive object={DECK_MAT} attach="material" />
        </mesh>
        <mesh position={[-0.78, 0.14, -1.3]}>
          <boxGeometry args={[0.05, 0.05, 2.4]} />
          <primitive object={STEEL_MAT} attach="material" />
        </mesh>
        <mesh position={[0.78, 0.14, -1.3]}>
          <boxGeometry args={[0.05, 0.05, 2.4]} />
          <primitive object={STEEL_MAT} attach="material" />
        </mesh>
      </group>

      <Wake mat={FOAM_MAT} />
      {!riding && (
        <Billboard position={[0, 3.5, 0]}>
          <WorldLabel title="Kapal Feri" subtitle={`→ ${destIsland}`} color="#7dd3fc" width={5.2} height={1.95} />
        </Billboard>
      )}
    </group>
  )
}
