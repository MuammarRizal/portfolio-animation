import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import type { KeyState } from '../hooks/useKeyboard'
import { GEMS, HOUSES, ZONES, type HouseData, type ZoneData } from '../data/portfolio'
import { findNearestCreature } from '../game/creatures'
import type { CharacterPreset } from '../game/characters'
import { CLIP, MODELS, modelScale } from '../game/models'
import { sfx } from '../game/audio'
import {
  clampToBoundary,
  getTerrainHeight,
  HOUSE_INTERACT_RADIUS,
  resolveCollisions,
  type PlayerState,
} from '../game/world'

interface CharacterProps {
  preset: CharacterPreset
  keys: React.MutableRefObject<KeyState>
  cameraYawRef: React.MutableRefObject<number>
  playerRef: React.MutableRefObject<PlayerState>
  virtualInputRef: React.MutableRefObject<{ x: number; y: number }>
  virtualJumpRef: React.MutableRefObject<boolean>
  virtualSprintRef: React.MutableRefObject<boolean>
  attackRef: React.MutableRefObject<boolean>
  collectedRef: React.MutableRefObject<Set<number>>
  quality?: 'high' | 'low'
  /** True while the hero is a passenger on the ferry: input is ignored and the
   * model is planted on the deck by whoever owns the ride. */
  riding?: boolean
  onZoneChange: (zone: ZoneData | null) => void
  onHouseChange: (house: HouseData | null) => void
  onCollectGem: (id: number) => void
}

const PLAYER_RADIUS = 0.42
const GRAVITY = -26
const JUMP_FORCE = 10.5
/** Fallback swing length if the attack clip has not resolved yet. */
const SWING_TIME = 0.42
/** How long the landing pose holds before locomotion takes over again. */
const LAND_TIME = 0.6
const ATTACK_RANGE = 2.6
const RUN_SPEED = 11.5
const WALK_SPEED = 6.4

export const Character: React.FC<CharacterProps> = ({
  preset,
  keys,
  cameraYawRef,
  playerRef,
  virtualInputRef,
  virtualJumpRef,
  virtualSprintRef,
  attackRef,
  collectedRef,
  quality = 'high',
  riding = false,
  onZoneChange,
  onHouseChange,
  onCollectGem,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const tiltRef = useRef<THREE.Group>(null)
  const shadowRef = useRef<THREE.Mesh>(null)

  // Rigged GLB + its animations. Draco off (no gstatic CDN dependency), meshopt
  // on (drei bundles the decoder, and the models are meshopt-compressed).
  const { scene, animations } = useGLTF(MODELS[preset.model].url, false, true)
  const model = useMemo(() => cloneSkeleton(scene), [scene])
  const { actions } = useAnimations(animations, model)

  // Every character clone gets its own skeleton, so each needs its own shadow flags.
  useLayoutEffect(() => {
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = quality === 'high'
        // Skinned bounds are the bind pose, which sits outside most animation
        // poses — keep them on screen instead of popping out.
        mesh.frustumCulled = false
      }
    })
  }, [model, quality])

  // Physics state
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  const posY = useRef(0) // height above the ground
  const velY = useRef(0)
  const isGrounded = useRef(true)
  const targetRotation = useRef(0)
  const rollAngle = useRef(0)
  const lastZoneId = useRef<string | null>(null)
  const lastHouseId = useRef<string | null>(null)
  const landTimer = useRef(0)

  // Animation state
  const activeClip = useRef<string | null>(null)

  // Sword combat
  const swingActive = useRef(false)
  const swingT = useRef(0)
  const swingTotal = useRef(SWING_TIME)
  const swingHitDone = useRef(false)

  /** Cross-fade into `name`. `once` plays the clip a single time and holds. */
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

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group) return

    const dt = Math.min(delta, 0.1)

    // ---- RIDING: planted on the ferry deck, no input, no physics ----
    if (riding) {
      const pp = playerRef.current.position
      group.position.copy(pp)
      let turn = playerRef.current.rotation - group.rotation.y
      while (turn < -Math.PI) turn += Math.PI * 2
      while (turn > Math.PI) turn -= Math.PI * 2
      group.rotation.y += turn * Math.min(1, dt * 6)
      velocity.current.set(0, 0, 0)
      posY.current = 0
      velY.current = 0
      isGrounded.current = true
      swingActive.current = false
      attackRef.current = false
      if (tiltRef.current) tiltRef.current.rotation.z = THREE.MathUtils.lerp(tiltRef.current.rotation.z, 0, dt * 8)
      if (shadowRef.current) {
        const shadowMat = shadowRef.current.material as THREE.MeshBasicMaterial
        if (shadowMat) shadowMat.opacity = 0
      }
      fadeTo(CLIP.idle, 0.32)
      return
    }

    // 0. ADOPT EXTERNAL TELEPORT (fast travel writes playerRef.position)
    const pp = playerRef.current.position
    if (pp.x !== group.position.x || pp.z !== group.position.z) {
      group.position.x = pp.x
      group.position.z = pp.z
      posY.current = 0
      velY.current = 0
      velocity.current.set(0, 0, 0)
    }

    // 1. RAW INPUT
    let moveX = 0
    let moveZ = 0

    if (keys.current.forward) moveZ -= 1
    if (keys.current.backward) moveZ += 1
    if (keys.current.left) moveX -= 1
    if (keys.current.right) moveX += 1

    const vin = virtualInputRef.current
    moveX += vin.x
    moveZ += vin.y

    const inputLength = Math.hypot(moveX, moveZ)
    const isMoving = inputLength > 0.05
    const isRunning = keys.current.shift || Boolean(virtualSprintRef.current)

    // 2. CAMERA-RELATIVE MOVEMENT (GoW style: W = away from camera)
    const camYaw = cameraYawRef.current
    const fwdX = Math.sin(camYaw)
    const fwdZ = Math.cos(camYaw)
    const rightX = -Math.cos(camYaw)
    const rightZ = Math.sin(camYaw)

    const worldX = rightX * moveX + fwdX * -moveZ
    const worldZ = rightZ * moveX + fwdZ * -moveZ

    const worldLen = Math.hypot(worldX, worldZ)
    const magnitude = inputLength > 0 ? Math.min(1, inputLength) : 1
    const baseSpeed = (isRunning ? RUN_SPEED : WALK_SPEED) * magnitude

    if (isMoving && worldLen > 0.001) {
      const normX = worldX / worldLen
      const normZ = worldZ / worldLen

      const targetVelX = normX * baseSpeed
      const targetVelZ = normZ * baseSpeed

      const accelRate = isGrounded.current ? 14 : 7
      velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetVelX, dt * accelRate)
      velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetVelZ, dt * accelRate)

      targetRotation.current = Math.atan2(normX, normZ)

      let rotDiff = targetRotation.current - group.rotation.y
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
      rollAngle.current = THREE.MathUtils.lerp(rollAngle.current, -rotDiff * 0.25, dt * 8)
    } else {
      const decelRate = isGrounded.current ? 16 : 4
      velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, 0, dt * decelRate)
      velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, 0, dt * decelRate)
      rollAngle.current = THREE.MathUtils.lerp(rollAngle.current, 0, dt * 10)
    }

    // 3. JUMP & VERTICAL PHYSICS
    const jumpPressed = keys.current.jump || virtualJumpRef.current
    if (jumpPressed && isGrounded.current) {
      velY.current = JUMP_FORCE
      isGrounded.current = false
      sfx.jump()
    }

    if (!isGrounded.current) {
      velY.current += GRAVITY * dt
      posY.current += velY.current * dt
      if (posY.current <= 0) {
        posY.current = 0
        velY.current = 0
        isGrounded.current = true
        landTimer.current = LAND_TIME
        sfx.land()
      }
    }

    // 4. APPLY HORIZONTAL MOVEMENT + COLLISION + BOUNDARY
    const candidate = { x: group.position.x + velocity.current.x * dt, z: group.position.z + velocity.current.z * dt }
    resolveCollisions(candidate, PLAYER_RADIUS)
    clampToBoundary(candidate)
    group.position.x = candidate.x
    group.position.z = candidate.z

    // 5. GROUND FOLLOW (terrain)
    const groundY = getTerrainHeight(group.position.x, group.position.z)
    group.position.y = groundY + posY.current

    // Auto-face the nearest creature while swinging so the sword actually lands.
    if (swingActive.current) {
      const tgt = findNearestCreature(group.position.x, group.position.z, 4.5)
      if (tgt) {
        targetRotation.current = Math.atan2(tgt.pos.x - group.position.x, tgt.pos.z - group.position.z)
      }
    }

    const currentRot = group.rotation.y
    let diff = targetRotation.current - currentRot
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    group.rotation.y += diff * dt * 14

    // 6. ANIMATION
    const horizontalSpeed = Math.hypot(velocity.current.x, velocity.current.z)
    const isAirborneNow = !isGrounded.current

    if (shadowRef.current) {
      const heightFactor = Math.max(0.1, 1 - posY.current * 0.18)
      shadowRef.current.scale.set(heightFactor, heightFactor, 1)
      shadowRef.current.position.y = -posY.current + 0.02
      const shadowMat = shadowRef.current.material as THREE.MeshBasicMaterial
      if (shadowMat) shadowMat.opacity = Math.max(0.08, 0.4 * heightFactor)
    }

    // Gentle bank into turns (roll around the model's forward axis).
    if (tiltRef.current) {
      tiltRef.current.rotation.z = THREE.MathUtils.lerp(tiltRef.current.rotation.z, rollAngle.current * 0.5, dt * 8)
    }

    if (landTimer.current > 0) landTimer.current -= dt

    if (swingActive.current) {
      fadeTo(CLIP.attack, 0.06, true)
    } else if (isAirborneNow) {
      const ascending = velY.current > 0
      fadeTo(ascending ? CLIP.jumpStart : CLIP.jumpIdle, 0.12, ascending)
    } else if (landTimer.current > 0) {
      fadeTo(CLIP.jumpLand, 0.1, true)
    } else if (horizontalSpeed > 0.4) {
      const loco = isRunning ? CLIP.run : CLIP.walk
      fadeTo(loco, 0.18)
      const action = actions[loco]
      // Match the cycle to the actual speed so the feet do not skate.
      if (action) {
        action.setEffectiveTimeScale(THREE.MathUtils.clamp(horizontalSpeed / (isRunning ? RUN_SPEED : WALK_SPEED), 0.6, 1.6))
      }
    } else {
      fadeTo(CLIP.idle, 0.22)
    }

    // 6b. SWORD SWING — trigger, play the attack once, land the hit
    if (attackRef.current && !swingActive.current) {
      attackRef.current = false
      swingActive.current = true
      swingHitDone.current = false
      const clip = actions[CLIP.attack]?.getClip()
      swingTotal.current = clip && clip.duration > 0 ? clip.duration : SWING_TIME
      swingT.current = swingTotal.current
      sfx.swing()
    }

    if (swingActive.current) {
      swingT.current -= dt
      const t = 1 - Math.max(0, swingT.current) / swingTotal.current

      // Land the hit on the strike frames.
      if (!swingHitDone.current && t >= 0.45) {
        swingHitDone.current = true
        const target = findNearestCreature(group.position.x, group.position.z, ATTACK_RANGE)
        if (target) {
          const tdx = target.pos.x - group.position.x
          const tdz = target.pos.z - group.position.z
          const td = Math.hypot(tdx, tdz) || 1
          const fx = Math.sin(group.rotation.y)
          const fz = Math.cos(group.rotation.y)
          if ((tdx / td) * fx + (tdz / td) * fz > 0.15) {
            target.hit()
            sfx.hit()
          }
        }
      }

      if (swingT.current <= 0) swingActive.current = false
    }

    // 7. PUBLISH PLAYER STATE (ref, no React re-render)
    pp.copy(group.position)
    playerRef.current.rotation = group.rotation.y
    playerRef.current.sprinting = isRunning && horizontalSpeed > 3
    playerRef.current.airborne = isAirborneNow

    // 8. ZONE PROXIMITY (callback only on change)
    let activeZone: ZoneData | null = null
    for (const zone of ZONES) {
      if (Math.hypot(group.position.x - zone.position[0], group.position.z - zone.position[2]) < zone.radius) {
        activeZone = zone
        break
      }
    }
    const nextId = activeZone ? activeZone.id : null
    if (nextId !== lastZoneId.current) {
      lastZoneId.current = nextId
      onZoneChange(activeZone)
    }

    // 8b. HOUSE PROXIMITY (nearest solid house → its mini-zone prompt)
    let activeHouse: HouseData | null = null
    let nearestHouse = HOUSE_INTERACT_RADIUS
    for (const house of HOUSES) {
      const d = Math.hypot(group.position.x - house.x, group.position.z - house.z)
      if (d < nearestHouse) {
        nearestHouse = d
        activeHouse = house
      }
    }
    const nextHouseId = activeHouse ? activeHouse.id : null
    if (nextHouseId !== lastHouseId.current) {
      lastHouseId.current = nextHouseId
      onHouseChange(activeHouse)
    }

    // 9. GEM PICKUP
    for (const gem of GEMS) {
      if (collectedRef.current.has(gem.id)) continue
      const hd = Math.hypot(group.position.x - gem.x, group.position.z - gem.z)
      if (hd < 1.5) {
        const gemY = getTerrainHeight(gem.x, gem.z) + gem.y
        if (Math.abs(group.position.y - gemY) < 2.0) {
          onCollectGem(gem.id)
          sfx.gem()
        }
      }
    }
  })

  return (
    <group
      ref={groupRef}
      position={[playerRef.current.position.x, 0, playerRef.current.position.z]}
    >
      <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#050811" transparent opacity={0.4} />
      </mesh>

      <group ref={tiltRef}>
        <group scale={preset.build * modelScale(preset.model)}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  )
}
