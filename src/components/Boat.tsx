import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { KeyState } from '../hooks/useKeyboard'
import { DOCKS, SEA_BOUNDS, SEA_LEVEL, getTerrainHeight, type Dock, type PlayerState } from '../game/world'

/** What the player can do with the boat right now. */
export interface DockPrompt {
  kind: 'board' | 'disembark'
  dock: Dock
}

/** Live state of the boat (mutated per frame, never React state). */
export interface BoatState {
  x: number
  z: number
  yaw: number
  speed: number
}

const MAX_SPEED = 17
const ACCEL = 11
const DRAG = 1.5
const TURN_RATE = 1.5
/** How close the hero must stand to a pier's boarding spot to climb aboard. */
const BOARD_DISTANCE = 10
/** How close the hull must be to a pier's mooring to tie up. */
const MOOR_DISTANCE = 13
/** A pier the boat is currently resting at, if any. */
const PARKED_DISTANCE = 22
/** Water this shallow (or land above it) blocks the hull. */
const SHALLOW = SEA_LEVEL + 1.6

const HULL_MAT = new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.85, flatShading: true })
const TRIM_MAT = new THREE.MeshStandardMaterial({ color: '#c9a06a', roughness: 0.8, flatShading: true })
const SAIL_MAT = new THREE.MeshStandardMaterial({
  color: '#f8fafc',
  roughness: 0.9,
  side: THREE.DoubleSide,
})
const MAST_MAT = new THREE.MeshStandardMaterial({ color: '#5a3b22', roughness: 0.85 })

/** A little low-poly dinghy with a single sail, built facing +Z. */
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
    {/* mast + sail */}
    <mesh castShadow position={[0, 1.7, 0.1]}>
      <cylinderGeometry args={[0.06, 0.08, 2.1, 6]} />
      <primitive object={MAST_MAT} attach="material" />
    </mesh>
    <mesh position={[0, 1.85, -0.06]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[1.7, 1.6]} />
      <primitive object={SAIL_MAT} attach="material" />
    </mesh>
  </group>
)

interface BoatProps {
  /** True while the hero has the tiller. */
  driving: boolean
  boatRef: React.MutableRefObject<BoatState>
  playerRef: React.MutableRefObject<PlayerState>
  keys: React.MutableRefObject<KeyState>
  virtualInputRef: React.MutableRefObject<{ x: number; y: number }>
  /** Filled with "do the context action" so keyboard + HUD share one path. */
  actionRef: React.MutableRefObject<() => void>
  onPromptChange: (prompt: DockPrompt | null) => void
  onBoard: (dock: Dock) => void
  onDisembark: (dock: Dock) => void
}

/**
 * The archipelago's one dinghy, steered by hand. Moored at a pier it bobs in
 * place; walk up and press [E] to take the tiller, steer with the same controls
 * the hero uses (WASD / analog stick), and press [E] again alongside a pier to
 * step ashore. Writes into `playerRef` so the follow camera and radar track it.
 */
export const Boat: React.FC<BoatProps> = ({
  driving,
  boatRef,
  playerRef,
  keys,
  virtualInputRef,
  actionRef,
  onPromptChange,
  onBoard,
  onDisembark,
}) => {
  const groupRef = useRef<THREE.Group>(null!)
  const promptId = useRef<string | null>(null)
  const grace = useRef(0)

  const report = (prompt: DockPrompt | null) => {
    const key = prompt ? prompt.kind : null
    if (key === promptId.current) return
    promptId.current = key
    onPromptChange(prompt)
    if (!prompt) {
      actionRef.current = () => {}
    } else if (prompt.kind === 'board') {
      const dock = prompt.dock
      actionRef.current = () => onBoard(dock)
    } else {
      const dock = prompt.dock
      actionRef.current = () => onDisembark(dock)
    }
  }

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.06)
    const rec = boatRef.current
    const t = state.clock.elapsedTime

    if (driving) {
      grace.current = Math.max(0, grace.current - dt)

      const vy = virtualInputRef.current
      const throttle = (keys.current.forward ? 1 : 0) - (keys.current.backward ? 1 : 0) - vy.y
      const rudder = (keys.current.left ? 1 : 0) - (keys.current.right ? 1 : 0) + vy.x

      const thr = THREE.MathUtils.clamp(throttle, -1, 1)
      if (thr !== 0) rec.speed += ACCEL * (thr > 0 ? thr : thr * 0.6) * dt
      else rec.speed -= Math.sign(rec.speed) * Math.min(Math.abs(rec.speed), DRAG * 6 * dt)
      rec.speed = THREE.MathUtils.clamp(rec.speed, -MAX_SPEED * 0.4, MAX_SPEED)

      // Steering scales with way-on, so a stalled hull barely answers the helm.
      const steer = THREE.MathUtils.clamp(rudder, -1, 1)
      const bite = 0.35 + Math.min(1, Math.abs(rec.speed) / 8)
      rec.yaw += steer * TURN_RATE * dt * bite * Math.sign(rec.speed || 1)

      const fx = Math.sin(rec.yaw)
      const fz = Math.cos(rec.yaw)
      const nx = rec.x + fx * rec.speed * dt
      const nz = rec.z + fz * rec.speed * dt

      const grounded = getTerrainHeight(nx, nz) > SHALLOW
      const inBounds =
        nx > SEA_BOUNDS.minX && nx < SEA_BOUNDS.maxX && nz > SEA_BOUNDS.minZ && nz < SEA_BOUNDS.maxZ
      if (grounded || !inBounds) {
        rec.speed *= -0.15 // bump the shallows and float back
      } else {
        rec.x = nx
        rec.z = nz
      }

      // Drive the hero ref so camera, radar and shaders follow the boat.
      const p = playerRef.current.position
      p.set(rec.x, SEA_LEVEL, rec.z)
      playerRef.current.rotation = rec.yaw
      playerRef.current.sprinting = false
      playerRef.current.airborne = false

      // Tie up at the nearest pier, but not in the first instant after boarding.
      let dock: Dock | null = null
      let bestD = MOOR_DISTANCE
      for (const d of DOCKS) {
        const dist = Math.hypot(rec.x - d.boatX, rec.z - d.boatZ)
        if (dist < bestD) {
          bestD = dist
          dock = d
        }
      }
      const slow = Math.abs(rec.speed) < 6
      report(grace.current <= 0 && dock && slow ? { kind: 'disembark', dock } : null)
    } else {
      // On foot: stand at a pier's boarding spot while the hull is tied there.
      const p = playerRef.current.position
      let dock: Dock | null = null
      let bestD = BOARD_DISTANCE
      for (const d of DOCKS) {
        const parked = Math.hypot(rec.x - d.boatX, rec.z - d.boatZ) < PARKED_DISTANCE
        const stand = Math.hypot(p.x - d.x, p.z - d.z)
        if (parked && stand < bestD) {
          bestD = stand
          dock = d
        }
      }
      report(dock ? { kind: 'board', dock } : null)
      grace.current = 0.6
    }

    // Bob the hull wherever it happens to be.
    const g = groupRef.current
    if (g) {
      g.position.set(rec.x, SEA_LEVEL + 0.1 + Math.sin(t * 1.7) * 0.13, rec.z)
      g.rotation.set(Math.sin(t * 1.1) * 0.035, rec.yaw, Math.sin(t * 0.85) * 0.045)
    }
  })

  return (
    <group ref={groupRef} position={[boatRef.current.x, SEA_LEVEL, boatRef.current.z]}>
      <BoatHull />
    </group>
  )
}
