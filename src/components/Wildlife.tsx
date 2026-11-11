import React, { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { distanceToPath, getTerrainHeight, isWalkable, type PlayerState, type World } from '../game/world'
import { creatureRegistry, type CreatureEntry, type CreatureType } from '../game/creatures'

const MIN_RADIUS = 12
const MAX_RADIUS = 54

/** A random standable point on `world`, returned in world coordinates. */
function randomWalkable(world: World): [number, number] {
  const [ox, oz] = world.def.origin
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2
    const d = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS)
    const x = ox + Math.cos(a) * d
    const z = oz + Math.sin(a) * d
    if (isWalkable(x, z) && distanceToPath(x, z) > 3) return [x, z]
  }
  return [ox + 20, oz + 20]
}

/** Ground animal that wanders the realm, flees when approached, and can be hunted. */
const Wanderer: React.FC<{
  id: string
  type: CreatureType
  start: [number, number]
  world: World
  playerRef: React.MutableRefObject<PlayerState>
  onHunt: () => void
}> = ({ id, type, start, world, playerRef, onHunt }) => {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const legRefs = useRef<THREE.Mesh[]>([])
  const poofRef = useRef<THREE.Mesh>(null)

  const target = useRef(new THREE.Vector3(start[0], 0, start[1]))
  const mode = useRef<'idle' | 'move'>('idle')
  const timer = useRef(Math.random() * 3)
  const walkPhase = useRef(0)

  const baseSpeed = useRef(type === 'deer' ? 3.4 : type === 'sheep' ? 1.6 : 4.2)

  // Hunting / lifecycle state
  const alive = useRef(true)
  const hitFlag = useRef(false)
  const respawnT = useRef(0)
  const poofT = useRef(0)
  const entryRef = useRef<CreatureEntry | null>(null)

  // Register in the shared registry so combat + the radar see this exact creature.
  useLayoutEffect(() => {
    const entry: CreatureEntry = {
      id,
      type,
      alive: true,
      pos: new THREE.Vector3(start[0], 0, start[1]),
      hit: () => {
        hitFlag.current = true
      },
    }
    entryRef.current = entry
    creatureRegistry.set(id, entry)
    return () => {
      creatureRegistry.delete(id)
    }
  }, [id, type, start])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return
    const dt = Math.min(delta, 0.1)

    // Publish live position + liveness to the radar/combat registry.
    const entry = entryRef.current
    if (entry) {
      entry.pos.set(group.position.x, 0, group.position.z)
      entry.alive = alive.current
    }

    // Poof puff — always animates, independent of the animal's state.
    if (poofT.current > 0) {
      poofT.current = Math.max(0, poofT.current - dt)
      const k = 1 - poofT.current / 0.6
      if (poofRef.current) {
        poofRef.current.visible = true
        poofRef.current.scale.setScalar(0.35 + k * 1.7)
        const mat = poofRef.current.material as THREE.MeshBasicMaterial
        if (mat) mat.opacity = (1 - k) * 0.9
      }
    } else if (poofRef.current && poofRef.current.visible) {
      poofRef.current.visible = false
    }

    // Defeated: wait a moment, then respawn somewhere else on the island.
    if (!alive.current) {
      respawnT.current -= dt
      if (respawnT.current <= 0) {
        const [nx, nz] = randomWalkable(world)
        group.position.set(nx, getTerrainHeight(nx, nz), nz)
        group.scale.setScalar(1)
        group.visible = true
        alive.current = true
        mode.current = 'idle'
        timer.current = 1 + Math.random() * 3
      }
      return
    }

    // Sword connected — vanish in a puff of leaves and report the hunt.
    if (hitFlag.current) {
      hitFlag.current = false
      alive.current = false
      respawnT.current = 11
      poofT.current = 0.6
      group.visible = false
      onHunt()
      return
    }

    // Flee when the hero gets close.
    const p = playerRef.current.position
    const pdx = group.position.x - p.x
    const pdz = group.position.z - p.z
    const pd = Math.hypot(pdx, pdz)
    const fleeing = pd < 9

    let speed = baseSpeed.current
    if (fleeing) {
      const inv = pd > 0.001 ? 1 / pd : 0
      const fx = group.position.x + pdx * inv * 16
      const fz = group.position.z + pdz * inv * 16
      const [ox, oz] = world.def.origin
      const cd = Math.hypot(fx - ox, fz - oz)
      const maxD = world.def.boundaryRadius - 6
      const k = cd > maxD ? maxD / cd : 1
      target.current.set(ox + (fx - ox) * k, 0, oz + (fz - oz) * k)
      mode.current = 'move'
      timer.current = 1.2
      speed = baseSpeed.current * 1.9 + 2
    }

    if (mode.current === 'idle') {
      timer.current -= dt
      if (bodyRef.current) {
        bodyRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.6 + start[0]) * 0.015
      }
      legRefs.current.forEach((leg) => {
        if (leg) leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, dt * 6)
      })
      group.position.y = getTerrainHeight(group.position.x, group.position.z)
      if (timer.current <= 0) {
        const [nx, nz] = randomWalkable(world)
        target.current.set(nx, 0, nz)
        mode.current = 'move'
        timer.current = 3 + Math.random() * 6
      }
      return
    }

    const dx = target.current.x - group.position.x
    const dz = target.current.z - group.position.z
    const dist = Math.hypot(dx, dz)

    if (dist < 0.8 || timer.current <= 0) {
      mode.current = 'idle'
      timer.current = 1.5 + Math.random() * 4
      return
    }

    if (!fleeing) timer.current -= dt

    const dirX = dx / dist
    const dirZ = dz / dist

    const nextX = group.position.x + dirX * speed * dt
    const nextZ = group.position.z + dirZ * speed * dt

    if (!isWalkable(nextX, nextZ)) {
      mode.current = 'idle'
      timer.current = 0.5
      return
    }

    group.position.x = nextX
    group.position.z = nextZ

    const targetRot = Math.atan2(dirX, dirZ)
    let diff = targetRot - group.rotation.y
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    group.rotation.y += diff * dt * 6

    walkPhase.current += dt * (type === 'rabbit' ? 9 : speed * 2.6)
    let hop = 0
    if (type === 'rabbit') {
      hop = Math.abs(Math.sin(walkPhase.current)) * 0.35
      if (bodyRef.current) bodyRef.current.rotation.x = -Math.abs(Math.sin(walkPhase.current)) * 0.25
    } else {
      const swing = Math.sin(walkPhase.current) * (type === 'deer' ? 0.5 : 0.35)
      legRefs.current.forEach((leg, i) => {
        if (leg) leg.rotation.x = i % 2 === 0 ? swing : -swing
      })
      if (bodyRef.current) {
        bodyRef.current.position.y = Math.abs(Math.sin(walkPhase.current)) * 0.04
        bodyRef.current.rotation.z = Math.sin(walkPhase.current * 0.5) * 0.03
      }
    }

    group.position.y = getTerrainHeight(group.position.x, group.position.z) + hop
  })

  const leg = (x: number, z: number, color: string, h = 0.7, w = 0.12) => (
    <mesh
      ref={(el) => {
        if (el) legRefs.current.push(el)
      }}
      position={[x, h / 2, z]}
    >
      <boxGeometry args={[w, h, w]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )

  return (
    <group ref={groupRef} position={[start[0], getTerrainHeight(start[0], start[1]), start[1]]}>
      <group ref={bodyRef}>
        {type === 'deer' && (
          <>
            <mesh position={[0, 1.0, 0]} castShadow>
              <boxGeometry args={[0.62, 0.6, 1.3]} />
              <meshStandardMaterial color="#9a6b3f" roughness={0.7} />
            </mesh>
            <mesh position={[0, 1.4, 0.72]} castShadow>
              <boxGeometry args={[0.34, 0.34, 0.5]} />
              <meshStandardMaterial color="#a9784a" roughness={0.7} />
            </mesh>
            <mesh position={[-0.16, 1.62, 0.7]} rotation={[-0.4, 0, -0.3]}>
              <coneGeometry args={[0.08, 0.28, 5]} />
              <meshStandardMaterial color="#8a5c33" />
            </mesh>
            <mesh position={[0.16, 1.62, 0.7]} rotation={[-0.4, 0, 0.3]}>
              <coneGeometry args={[0.08, 0.28, 5]} />
              <meshStandardMaterial color="#8a5c33" />
            </mesh>
            <mesh position={[-0.16, 1.75, 0.6]} rotation={[-0.2, 0, -0.5]}>
              <coneGeometry args={[0.05, 0.5, 4]} />
              <meshStandardMaterial color="#e7d3b0" />
            </mesh>
            <mesh position={[0.16, 1.75, 0.6]} rotation={[-0.2, 0, 0.5]}>
              <coneGeometry args={[0.05, 0.5, 4]} />
              <meshStandardMaterial color="#e7d3b0" />
            </mesh>
            {leg(-0.24, -0.45, '#7a4f2b', 0.75)}
            {leg(0.24, -0.45, '#7a4f2b', 0.75)}
            {leg(-0.24, 0.45, '#7a4f2b', 0.75)}
            {leg(0.24, 0.45, '#7a4f2b', 0.75)}
          </>
        )}

        {type === 'sheep' && (
          <>
            <mesh position={[0, 0.85, 0]} castShadow>
              <dodecahedronGeometry args={[0.6, 0]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.9} flatShading />
            </mesh>
            <mesh position={[0, 0.95, 0.6]} castShadow>
              <boxGeometry args={[0.32, 0.34, 0.34]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
            {leg(-0.22, -0.32, '#334155', 0.55, 0.11)}
            {leg(0.22, -0.32, '#334155', 0.55, 0.11)}
            {leg(-0.22, 0.32, '#334155', 0.55, 0.11)}
            {leg(0.22, 0.32, '#334155', 0.55, 0.11)}
          </>
        )}

        {type === 'rabbit' && (
          <>
            <mesh position={[0, 0.42, 0]} castShadow>
              <sphereGeometry args={[0.32, 12, 12]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.62, 0.26]} castShadow>
              <sphereGeometry args={[0.22, 12, 12]} />
              <meshStandardMaterial color="#eef2f7" roughness={0.85} />
            </mesh>
            <mesh position={[-0.1, 0.9, 0.24]} rotation={[0.2, 0, -0.1]}>
              <boxGeometry args={[0.08, 0.42, 0.06]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            <mesh position={[0.1, 0.9, 0.24]} rotation={[0.2, 0, 0.1]}>
              <boxGeometry args={[0.08, 0.42, 0.06]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            {leg(-0.16, 0.2, '#cbd5e1')}
            {leg(0.16, 0.2, '#cbd5e1')}
            {leg(-0.16, -0.2, '#cbd5e1')}
            {leg(0.16, -0.2, '#cbd5e1')}
          </>
        )}
      </group>

      <mesh ref={poofRef} position={[0, 0.7, 0]} visible={false}>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshBasicMaterial color="#f8fafc" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Bird circling far above the realm. */
const Bird: React.FC<{ start: [number, number, number]; radius: number; height: number; speed: number }> = ({
  start,
  radius,
  height,
  speed,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const leftWing = useRef<THREE.Mesh>(null)
  const rightWing = useRef<THREE.Mesh>(null)
  const angle = useRef(Math.random() * Math.PI * 2)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    angle.current += dt * speed
    if (groupRef.current) {
      groupRef.current.position.x = start[0] + Math.cos(angle.current) * radius
      groupRef.current.position.z = start[2] + Math.sin(angle.current) * radius
      groupRef.current.position.y = height + Math.sin(state.clock.elapsedTime * 0.8 + angle.current) * 1.2
      groupRef.current.rotation.y = -angle.current + Math.PI / 2
    }
    const flap = Math.sin(state.clock.elapsedTime * 12) * 0.55
    if (leftWing.current) leftWing.current.rotation.z = flap
    if (rightWing.current) rightWing.current.rotation.z = -flap
  })

  return (
    <group ref={groupRef} position={start}>
      <mesh>
        <boxGeometry args={[0.16, 0.14, 0.6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh ref={leftWing} position={[-0.32, 0.05, 0]}>
        <boxGeometry args={[0.6, 0.04, 0.24]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh ref={rightWing} position={[0.32, 0.05, 0]}>
        <boxGeometry args={[0.6, 0.04, 0.24]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  )
}

/** Fluttering butterfly near a point. */
const Butterfly: React.FC<{ center: [number, number, number]; color: string; phase: number }> = ({
  center,
  color,
  phase,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const leftWing = useRef<THREE.Mesh>(null)
  const rightWing = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase
    if (groupRef.current) {
      groupRef.current.position.x = center[0] + Math.cos(t * 0.7) * 2.2
      groupRef.current.position.z = center[2] + Math.sin(t * 0.9) * 2.2
      groupRef.current.position.y = center[1] + 0.9 + Math.sin(t * 2.4) * 0.35
      groupRef.current.rotation.y = t * 0.5
    }
    const flap = Math.sin(t * 18) * 0.9
    if (leftWing.current) leftWing.current.rotation.y = flap
    if (rightWing.current) rightWing.current.rotation.y = -flap
  })

  return (
    <group ref={groupRef} position={center}>
      <mesh>
        <boxGeometry args={[0.05, 0.05, 0.16]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh ref={leftWing} position={[-0.09, 0, 0]}>
        <planeGeometry args={[0.22, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={rightWing} position={[0.09, 0, 0]}>
        <planeGeometry args={[0.22, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ---- instanced glowing flora ----
const PLANT_GEO = {
  stemShort: (() => {
    const g = new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8)
    g.translate(0, 0.2, 0)
    return g
  })(),
  cap: (() => {
    const g = new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)
    g.translate(0, 0.44, 0)
    return g
  })(),
  stemTall: (() => {
    const g = new THREE.CylinderGeometry(0.03, 0.05, 0.7, 6)
    g.translate(0, 0.35, 0)
    return g
  })(),
  bloom: (() => {
    const g = new THREE.IcosahedronGeometry(0.18, 0)
    g.translate(0, 0.75, 0)
    return g
  })(),
}

const PLANT_MAT = {
  stem: new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.8 }),
  cap: new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#22d3ee', emissiveIntensity: 1, roughness: 0.3 }),
  stemTall: new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.8 }),
  bloom: new THREE.MeshStandardMaterial({ color: '#a78bfa', emissive: '#a78bfa', emissiveIntensity: 1 }),
}

interface Plant {
  x: number
  y: number
  z: number
  scale: number
  rot: number
}

const PlantBatch: React.FC<{ geometry: THREE.BufferGeometry; material: THREE.Material; items: Plant[] }> = ({
  geometry,
  material,
  items,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const axis = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      q.setFromAxisAngle(axis, it.rot)
      p.set(it.x, it.y, it.z)
      s.setScalar(it.scale)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items, geometry])
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={false} receiveShadow />
}

export const Wildlife: React.FC<{
  world: World
  quality?: 'high' | 'low'
  playerRef: React.MutableRefObject<PlayerState>
  onHunt: () => void
}> = ({ world, quality = 'high', playerRef, onHunt }) => {
  const low = quality === 'low'

  const creatures = useMemo(() => {
    const counts: Record<CreatureType, number> = low ? { deer: 2, sheep: 2, rabbit: 2 } : { deer: 3, sheep: 4, rabbit: 4 }
    const list: Array<{ id: string; type: CreatureType; start: [number, number] }> = []
    ;(['deer', 'sheep', 'rabbit'] as CreatureType[]).forEach((type) => {
      for (let i = 0; i < counts[type]; i++) {
        list.push({ id: `${world.def.id}-${type}-${i}`, type, start: randomWalkable(world) })
      }
    })
    return list
  }, [low, world])

  const birds = useMemo(() => {
    const n = low ? 3 : 5
    const [ox, oz] = world.def.origin
    return Array.from({ length: n }, (_, i) => ({
      id: `${world.def.id}-bird-${i}`,
      start: [ox + Math.cos(i) * 30, 0, oz + Math.sin(i * 1.7) * 30] as [number, number, number],
      radius: 10 + ((i * 7) % 22),
      height: 24 + ((i * 5) % 14),
      speed: 0.25 + ((i * 3) % 5) * 0.07,
    }))
  }, [low, world])

  const butterflies = useMemo(() => {
    const n = low ? 4 : 6
    const colors = ['#f472b6', '#fbbf24', '#38bdf8', '#a78bfa', '#34d399']
    return Array.from({ length: n }, (_, i) => {
      const [x, z] = randomWalkable(world)
      return {
        id: `${world.def.id}-bfly-${i}`,
        center: [x, getTerrainHeight(x, z), z] as [number, number, number],
        color: colors[i % colors.length],
        phase: Math.random() * 10,
      }
    })
  }, [low, world])

  const { mushrooms, blossoms } = useMemo(() => {
    const n = low ? 12 : 24
    const mushrooms: Plant[] = []
    const blossoms: Plant[] = []
    for (let i = 0; i < n; i++) {
      const [x, z] = randomWalkable(world)
      const plant: Plant = {
        x,
        y: getTerrainHeight(x, z),
        z,
        scale: 0.8 + Math.random() * 0.8,
        rot: Math.random() * Math.PI * 2,
      }
      if (i % 3 === 0) blossoms.push(plant)
      else mushrooms.push(plant)
    }
    return { mushrooms, blossoms }
  }, [low, world])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = 0.6 + Math.sin(t * 2.2) * 0.4
    PLANT_MAT.cap.emissiveIntensity = 0.5 + pulse * 0.8
    PLANT_MAT.bloom.emissiveIntensity = 0.5 + pulse * 0.8
  })

  return (
    <group>
      {creatures.map((c) => (
        <Wanderer key={c.id} id={c.id} type={c.type} start={c.start} world={world} playerRef={playerRef} onHunt={onHunt} />
      ))}

      {birds.map((b) => (
        <Bird key={b.id} start={b.start} radius={b.radius} height={b.height} speed={b.speed} />
      ))}

      {butterflies.map((b) => (
        <Butterfly key={b.id} center={b.center} color={b.color} phase={b.phase} />
      ))}

      {mushrooms.length > 0 && (
        <>
          <PlantBatch geometry={PLANT_GEO.stemShort} material={PLANT_MAT.stem} items={mushrooms} />
          <PlantBatch geometry={PLANT_GEO.cap} material={PLANT_MAT.cap} items={mushrooms} />
        </>
      )}
      {blossoms.length > 0 && (
        <>
          <PlantBatch geometry={PLANT_GEO.stemTall} material={PLANT_MAT.stemTall} items={blossoms} />
          <PlantBatch geometry={PLANT_GEO.bloom} material={PLANT_MAT.bloom} items={blossoms} />
        </>
      )}
    </group>
  )
}
