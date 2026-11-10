import React, { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { VILLAGERS, npcRegistry, type NpcEntry, type VillagerDef } from '../game/npcs'
import { CLIP, MODELS, modelScale } from '../game/models'
import { BOUNDARY_RADIUS, getTerrainHeight, isWalkable, type PlayerState } from '../game/world'
import { sfx } from '../game/audio'

const WALK_SPEED = 1.5
/** Player closer than this makes the villager stop, face him and possibly wave. */
const GREET_DISTANCE = 6

/** A friendly villager: wanders near home, faces the hero and waves hello. */
const Villager: React.FC<{
  def: VillagerDef
  playerRef: React.MutableRefObject<PlayerState>
  castShadow: boolean
}> = ({ def, playerRef, castShadow }) => {
  const groupRef = useRef<THREE.Group>(null)

  const { scene, animations } = useGLTF(MODELS[def.model].url, false, true)
  const model = useMemo(() => cloneSkeleton(scene), [scene])
  const { actions } = useAnimations(animations, model)

  useLayoutEffect(() => {
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = castShadow
        mesh.frustumCulled = false
      }
    })
  }, [model, castShadow])

  const home = useRef(new THREE.Vector2(def.home[0], def.home[1]))
  const target = useRef(new THREE.Vector2(def.home[0], def.home[1]))
  const mode = useRef<'idle' | 'walk'>('idle')
  const timer = useRef(1 + Math.random() * 3)
  const targetRot = useRef(0)
  const waveT = useRef(0)
  const greetCooldown = useRef(0)
  const activeClip = useRef<string | null>(null)

  const fadeTo = (name: string, fade: number, once = false) => {
    if (activeClip.current === name) return
    const next = actions[name]
    if (!next) return
    const prev = activeClip.current ? actions[activeClip.current] : null
    if (prev && prev !== next) prev.fadeOut(fade)
    next.reset()
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity)
    next.clampWhenFinished = once
    next.enabled = true
    next.setEffectiveWeight(1)
    next.fadeIn(fade)
    next.play()
    activeClip.current = name
  }

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

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group) return
    const dt = Math.min(delta, 0.1)

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

    // Animation: wave > walk > idle.
    if (waveT.current > 0) {
      fadeTo(CLIP.cheer, 0.15, true)
    } else if (speed > 0.01) {
      fadeTo(CLIP.walk, 0.2)
    } else {
      fadeTo(CLIP.idle, 0.25)
    }
  })

  return (
    <group ref={groupRef} position={[def.home[0], getTerrainHeight(def.home[0], def.home[1]), def.home[1]]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 24]} />
        <meshBasicMaterial color="#050811" transparent opacity={0.32} />
      </mesh>

      <group scale={modelScale(def.model)}>
        <primitive object={model} />
      </group>
    </group>
  )
}

/** All villagers roaming the realm. */
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
