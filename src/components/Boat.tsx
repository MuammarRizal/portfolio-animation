import React, { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { DOCKS, type Dock, type PlayerState } from '../game/world'
import { waveHeight } from '../game/ocean'
import { WorldLabel } from './WorldLabel'

/** What the hero can do with the ferry right now. */
export interface DockPrompt {
  kind: 'board' | 'disembark'
  dock: Dock
}

/** Seconds the ferry takes to cross between the two piers. */
const RIDE_TIME = 3.2
/** Stand within this of a pier's boarding spot to be offered a ride. */
const BOARD_DISTANCE = 9
/** Height of the deck the passenger stands on, above the waterline. */
const DECK_Y = 0.78
/** Aft offset of the passenger so they clear the mast. */
const DECK_Z = -0.45

const HULL_MAT = new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.85, flatShading: true })
const TRIM_MAT = new THREE.MeshStandardMaterial({ color: '#c9a06a', roughness: 0.8, flatShading: true })
const SAIL_MAT = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9, side: THREE.DoubleSide })
const MAST_MAT = new THREE.MeshStandardMaterial({ color: '#5a3b22', roughness: 0.85 })
const FLAG_MAT = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.7, side: THREE.DoubleSide })
const FOAM_MAT = new THREE.MeshBasicMaterial({
  color: '#eaf7ff',
  transparent: true,
  opacity: 0,
  depthWrite: false,
})

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

/** A little low-poly ferry, built facing +Z. */
const BoatHull: React.FC = () => (
  <group>
    <mesh castShadow position={[0, 0.34, 0]}>
      <boxGeometry args={[1.5, 0.68, 3.0]} />
      <primitive object={HULL_MAT} attach="material" />
    </mesh>
    <mesh castShadow position={[0, 0.34, 1.72]} rotation={[Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.75, 1.4, 4]} />
      <primitive object={HULL_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 0.72, 0]}>
      <boxGeometry args={[1.3, 0.1, 2.7]} />
      <primitive object={TRIM_MAT} attach="material" />
    </mesh>
    {/* gunwale rails */}
    <mesh position={[-0.76, 0.62, 0]}>
      <boxGeometry args={[0.12, 0.14, 3.1]} />
      <primitive object={TRIM_MAT} attach="material" />
    </mesh>
    <mesh position={[0.76, 0.62, 0]}>
      <boxGeometry args={[0.12, 0.14, 3.1]} />
      <primitive object={TRIM_MAT} attach="material" />
    </mesh>
    {/* mast + sail + pennant */}
    <mesh castShadow position={[0, 1.7, 0.1]}>
      <cylinderGeometry args={[0.06, 0.08, 2.1, 6]} />
      <primitive object={MAST_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 1.85, -0.06]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[1.7, 1.6]} />
      <primitive object={SAIL_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 2.72, 0.6]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[0.7, 0.4]} />
      <primitive object={FLAG_MAT} attach="material" />
    </mesh>
  </group>
)

/** Foam V trailing the hull; fades in and out with the crossing. */
const Wake: React.FC<{ mat: THREE.Material }> = ({ mat }) => (
  <group position={[0, 0.06, -1.7]}>
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.55, 0, -1.5]} rotation={[-Math.PI / 2, 0, side * 0.5]}>
        <planeGeometry args={[0.5, 4.2]} />
        <primitive object={mat} attach="material" />
      </mesh>
    ))}
    <mesh position={[0, 0, -2.4]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.1, 3.2]} />
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
 * The archipelago's ferry. It no longer answers the helm: step onto a pier,
 * press [E] and it steams itself to the other island's pier, then lets you off.
 * The hull rides the real Gerstner surface (`waveHeight`) so it sits *in* the
 * water, and while sailing the hero stands on the deck (see `Character` riding).
 */
export const Boat: React.FC<BoatProps> = ({ riding, quality, playerRef, onPromptChange, onArrive }) => {
  const groupRef = useRef<THREE.Group>(null!)
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

    // Offer a ride whenever the hero is standing at the pier the ferry is at.
    if (cooldown.current > 0) cooldown.current = Math.max(0, cooldown.current - dt)
    if (!riding && cooldown.current <= 0) {
      const p = playerRef.current.position
      const near = Math.hypot(p.x - f.from.x, p.z - f.from.z) < BOARD_DISTANCE
      report(near ? { kind: 'board', dock: f.from } : null)
    } else {
      report(null)
    }
  })

  return (
    <group ref={groupRef} position={[DOCKS[0].boatX, 0, DOCKS[0].boatZ]}>
      <BoatHull />
      <Wake mat={FOAM_MAT} />
      {!riding && (
        <Billboard position={[0, 3.4, 0]}>
          <WorldLabel title="Kapal Feri" subtitle={`→ ${destIsland}`} color="#7dd3fc" width={5.2} height={1.95} />
        </Billboard>
      )}
    </group>
  )
}
