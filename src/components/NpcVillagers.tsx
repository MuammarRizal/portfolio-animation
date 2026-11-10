import React, { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { VILLAGERS, npcRegistry, type NpcEntry, type VillagerDef } from '../game/npcs'
import { BOUNDARY_RADIUS, getTerrainHeight, isWalkable, type PlayerState } from '../game/world'
import { sfx } from '../game/audio'

const WALK_SPEED = 1.5
/** Player closer than this makes the villager stop, face him and possibly wave. */
const GREET_DISTANCE = 6

/** A friendly human villager: wanders near home, faces the hero and waves. */
const Villager: React.FC<{
  def: VillagerDef
  playerRef: React.MutableRefObject<PlayerState>
  castShadow: boolean
}> = ({ def, playerRef, castShadow }) => {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Mesh>(null)
  const rightLegRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)

  const home = useRef(new THREE.Vector2(def.home[0], def.home[1]))
  const target = useRef(new THREE.Vector2(def.home[0], def.home[1]))
  const mode = useRef<'idle' | 'walk'>('idle')
  const timer = useRef(1 + Math.random() * 3)
  const walkPhase = useRef(0)
  const targetRot = useRef(0)
  const waveT = useRef(0)
  const greetCooldown = useRef(0)

  // Register so the radar can plot this villager.
  useLayoutEffect(() => {
    const entry: NpcEntry = {
      id: def.id,
      name: def.name,
      color: def.accent,
      pos: new THREE.Vector3(def.home[0], 0, def.home[1]),
    }
    npcRegistry.set(def.id, entry)
    return () => {
      npcRegistry.delete(def.id)
    }
  }, [def.id, def.name, def.accent, def.home])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return
    const dt = Math.min(delta, 0.1)
    const t = state.clock.elapsedTime

    const entry = npcRegistry.get(def.id)
    if (entry) entry.pos.set(group.position.x, 0, group.position.z)

    const p = playerRef.current.position
    const pdx = p.x - group.position.x
    const pdz = p.z - group.position.z
    const pd = Math.hypot(pdx, pdz)

    if (greetCooldown.current > 0) greetCooldown.current -= dt
    if (waveT.current > 0) waveT.current -= dt

    // Player nearby: stop, look at him, and wave now and then.
    if (pd < GREET_DISTANCE) {
      mode.current = 'idle'
      timer.current = 1.2 + Math.random() * 2
      targetRot.current = Math.atan2(pdx, pdz)
      if (pd < 5 && waveT.current <= 0 && greetCooldown.current <= 0) {
        waveT.current = 1.8
        greetCooldown.current = 7 + Math.random() * 5
        sfx.greet(1 - pd / GREET_DISTANCE)
      }
    } else if (mode.current === 'idle') {
      timer.current -= dt
      if (timer.current <= 0) {
        const a = Math.random() * Math.PI * 2
        const r = 1.5 + Math.random() * def.wander
        const nx = home.current.x + Math.cos(a) * r
        const nz = home.current.y + Math.sin(a) * r
        if (isWalkable(nx, nz) && Math.hypot(nx, nz) < BOUNDARY_RADIUS - 6) {
          target.current.set(nx, nz)
          mode.current = 'walk'
        }
        timer.current = 2 + Math.random() * 4
      }
    }

    let speed = 0
    if (mode.current === 'walk') {
      const dx = target.current.x - group.position.x
      const dz = target.current.y - group.position.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.35) {
        mode.current = 'idle'
        timer.current = 2 + Math.random() * 4
      } else {
        const dirX = dx / dist
        const dirZ = dz / dist
        const nx = group.position.x + dirX * WALK_SPEED * dt
        const nz = group.position.z + dirZ * WALK_SPEED * dt
        if (!isWalkable(nx, nz)) {
          mode.current = 'idle'
          timer.current = 1
        } else {
          group.position.x = nx
          group.position.z = nz
          targetRot.current = Math.atan2(dirX, dirZ)
          speed = WALK_SPEED
        }
      }
    }

    group.position.y = getTerrainHeight(group.position.x, group.position.z)

    // Smooth turn toward the current facing target.
    let diff = targetRot.current - group.rotation.y
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    group.rotation.y += diff * dt * 6

    const waving = waveT.current > 0

    if (speed > 0.01) {
      walkPhase.current += dt * speed * 3.4
      const swing = Math.sin(walkPhase.current) * 0.5
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -swing * 0.8
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.06, dt * 8)
      }
      if (bodyRef.current) {
        bodyRef.current.position.y = 0.95 + Math.abs(Math.sin(walkPhase.current)) * 0.03
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.06, dt * 8)
      }
    } else {
      const breathe = Math.sin(t * 2 + def.home[0]) * 0.02
      if (bodyRef.current) {
        bodyRef.current.position.y = 0.95 + breathe
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, dt * 8)
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, dt * 8)
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, dt * 8)
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, dt * 8)
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.08, dt * 8)
      }
    }

    // The right arm either swings, idles, or waves hello.
    if (rightArmRef.current) {
      if (waving) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -2.4, dt * 10)
        rightArmRef.current.rotation.z = Math.sin(t * 11) * 0.55
      } else if (speed > 0.01) {
        rightArmRef.current.rotation.x = Math.sin(walkPhase.current) * 0.4
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.06, dt * 8)
      } else {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, dt * 8)
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.08, dt * 8)
      }
    }
  })

  return (
    <group ref={groupRef} position={[def.home[0], getTerrainHeight(def.home[0], def.home[1]), def.home[1]]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#050811" transparent opacity={0.32} />
      </mesh>

      <group ref={bodyRef} position={[0, 0.95, 0]}>
        {/* Head */}
        <mesh position={[0, 0.65, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.45, 0.45, 0.45]} />
          <meshStandardMaterial color={def.skin} roughness={0.55} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.1, 0.67, 0.231]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.1, 0.67, 0.231]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Hair */}
        <mesh position={[0, 0.87, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.49, 0.13, 0.49]} />
          <meshStandardMaterial color={def.hair} roughness={0.8} />
        </mesh>
        {def.hairStyle === 'spiky' && (
          <>
            <mesh position={[-0.12, 0.98, 0.1]} rotation={[-0.3, 0, -0.35]}>
              <coneGeometry args={[0.08, 0.22, 5]} />
              <meshStandardMaterial color={def.hair} roughness={0.8} />
            </mesh>
            <mesh position={[0.12, 0.98, 0.1]} rotation={[-0.3, 0, 0.35]}>
              <coneGeometry args={[0.08, 0.22, 5]} />
              <meshStandardMaterial color={def.hair} roughness={0.8} />
            </mesh>
          </>
        )}
        {def.hairStyle === 'long' && (
          <mesh position={[0, 0.5, -0.26]} castShadow={castShadow}>
            <boxGeometry args={[0.42, 0.7, 0.13]} />
            <meshStandardMaterial color={def.hair} roughness={0.8} />
          </mesh>
        )}
        {def.hairStyle === 'bun' && (
          <mesh position={[0, 0.84, -0.3]} castShadow={castShadow}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color={def.hair} roughness={0.8} />
          </mesh>
        )}

        {/* Torso */}
        <mesh position={[0, 0.15, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.55, 0.6, 0.35]} />
          <meshStandardMaterial color={def.top} roughness={0.65} />
        </mesh>

        {/* Apron / sash */}
        <mesh position={[0, 0.05, 0.19]}>
          <boxGeometry args={[0.42, 0.44, 0.03]} />
          <meshStandardMaterial color={def.accent} roughness={0.6} />
        </mesh>

        {/* Collar */}
        <mesh position={[0, 0.42, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.5, 0.1, 0.4]} />
          <meshStandardMaterial color={def.accent} roughness={0.55} />
        </mesh>

        {/* Arms */}
        <group position={[-0.38, 0.35, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.25, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.16, 0.5, 0.18]} />
            <meshStandardMaterial color={def.top} />
            <mesh position={[0, -0.3, 0]}>
              <boxGeometry args={[0.17, 0.14, 0.19]} />
              <meshStandardMaterial color={def.skin} roughness={0.6} />
            </mesh>
          </mesh>
        </group>

        <group position={[0.38, 0.35, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.25, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.16, 0.5, 0.18]} />
            <meshStandardMaterial color={def.top} />
            <mesh position={[0, -0.3, 0]}>
              <boxGeometry args={[0.17, 0.14, 0.19]} />
              <meshStandardMaterial color={def.skin} roughness={0.6} />
            </mesh>
          </mesh>
        </group>
      </group>

      {/* Legs */}
      <group position={[-0.16, 0.55, 0]}>
        <mesh ref={leftLegRef} position={[0, -0.25, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.18, 0.55, 0.2]} />
          <meshStandardMaterial color={def.pants} />
          <mesh position={[0, -0.21, 0.05]}>
            <boxGeometry args={[0.2, 0.16, 0.27]} />
            <meshStandardMaterial color="#3f3f46" roughness={0.7} />
          </mesh>
        </mesh>
      </group>

      <group position={[0.16, 0.55, 0]}>
        <mesh ref={rightLegRef} position={[0, -0.25, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.18, 0.55, 0.2]} />
          <meshStandardMaterial color={def.pants} />
          <mesh position={[0, -0.21, 0.05]}>
            <boxGeometry args={[0.2, 0.16, 0.27]} />
            <meshStandardMaterial color="#3f3f46" roughness={0.7} />
          </mesh>
        </mesh>
      </group>
    </group>
  )
}

/** All human villagers roaming the realm. */
export const NpcVillagers: React.FC<{
  playerRef: React.MutableRefObject<PlayerState>
  quality?: 'high' | 'low'
}> = ({ playerRef, quality = 'high' }) => {
  const castShadow = quality === 'high'
  return (
    <group>
      {VILLAGERS.map((def) => (
        <Villager key={def.id} def={def} playerRef={playerRef} castShadow={castShadow} />
      ))}
    </group>
  )
}
