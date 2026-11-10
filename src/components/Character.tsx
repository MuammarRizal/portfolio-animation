import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { KeyState } from '../hooks/useKeyboard'
import { GEMS, ZONES, type ZoneData } from '../data/portfolio'
import {
  clampToBoundary,
  getTerrainHeight,
  resolveCollisions,
  type PlayerState,
} from '../game/world'

interface CharacterProps {
  keys: React.MutableRefObject<KeyState>
  cameraYawRef: React.MutableRefObject<number>
  playerRef: React.MutableRefObject<PlayerState>
  virtualInputRef: React.MutableRefObject<{ x: number; y: number }>
  virtualJumpRef: React.MutableRefObject<boolean>
  virtualSprintRef: React.MutableRefObject<boolean>
  collectedRef: React.MutableRefObject<Set<number>>
  onZoneChange: (zone: ZoneData | null) => void
  onCollectGem: (id: number) => void
}

const PLAYER_RADIUS = 0.42
const GRAVITY = -26
const JUMP_FORCE = 10.5

export const Character: React.FC<CharacterProps> = ({
  keys,
  cameraYawRef,
  playerRef,
  virtualInputRef,
  virtualJumpRef,
  virtualSprintRef,
  collectedRef,
  onZoneChange,
  onCollectGem,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Mesh>(null)
  const rightLegRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)
  const shadowRef = useRef<THREE.Mesh>(null)
  const scarfRef = useRef<THREE.Mesh>(null)

  // Physics state
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  const posY = useRef(0) // height above the ground
  const velY = useRef(0)
  const isGrounded = useRef(true)
  const targetRotation = useRef(0)
  const walkCycle = useRef(0)
  const rollAngle = useRef(0)
  const landingSquash = useRef(1)
  const lastZoneId = useRef<string | null>(null)

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    const dt = Math.min(delta, 0.1)

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
    const baseSpeed = (isRunning ? 11.5 : 6.4) * magnitude

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
      landingSquash.current = 1.25
    }

    if (!isGrounded.current) {
      velY.current += GRAVITY * dt
      posY.current += velY.current * dt
      if (posY.current <= 0) {
        posY.current = 0
        velY.current = 0
        isGrounded.current = true
        landingSquash.current = 0.72
      }
    }

    landingSquash.current = THREE.MathUtils.lerp(landingSquash.current, 1.0, dt * 12)

    // 4. APPLY HORIZONTAL MOVEMENT + COLLISION + BOUNDARY
    const candidate = { x: group.position.x + velocity.current.x * dt, z: group.position.z + velocity.current.z * dt }
    resolveCollisions(candidate, PLAYER_RADIUS)
    clampToBoundary(candidate)
    group.position.x = candidate.x
    group.position.z = candidate.z

    // 5. GROUND FOLLOW (terrain)
    const groundY = getTerrainHeight(group.position.x, group.position.z)
    group.position.y = groundY + posY.current

    const currentRot = group.rotation.y
    let diff = targetRotation.current - currentRot
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    group.rotation.y += diff * dt * 14

    // 6. PROCEDURAL ANIMATION
    const horizontalSpeed = Math.hypot(velocity.current.x, velocity.current.z)
    const isAirborneNow = !isGrounded.current

    if (shadowRef.current) {
      const heightFactor = Math.max(0.1, 1 - posY.current * 0.18)
      shadowRef.current.scale.set(heightFactor, heightFactor, 1)
      shadowRef.current.position.y = -posY.current + 0.02
      const shadowMat = shadowRef.current.material as THREE.MeshBasicMaterial
      if (shadowMat) shadowMat.opacity = Math.max(0.08, 0.4 * heightFactor)
    }

    if (scarfRef.current) {
      const flutter = Math.sin(state.clock.elapsedTime * 15 + horizontalSpeed) * 0.3
      const trailing = isMoving ? -0.4 : 0
      scarfRef.current.rotation.x = THREE.MathUtils.lerp(scarfRef.current.rotation.x, trailing + flutter, dt * 10)
    }

    if (isAirborneNow) {
      const isAscending = velY.current > 0
      const pitch = isAscending ? -0.15 : 0.1

      if (bodyRef.current) {
        bodyRef.current.position.y = 0.95 * landingSquash.current
        bodyRef.current.scale.set(
          1 / Math.sqrt(landingSquash.current),
          landingSquash.current,
          1 / Math.sqrt(landingSquash.current)
        )
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, pitch, dt * 10)
        bodyRef.current.rotation.z = rollAngle.current
      }

      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, -0.65, dt * 12)
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, -0.45, dt * 12)

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.4, dt * 12)
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.5, dt * 12)
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0.4, dt * 12)
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.5, dt * 12)
      }
    } else if (horizontalSpeed > 0.2) {
      const speedMultiplier = isRunning ? 3.6 : 2.8
      walkCycle.current += dt * horizontalSpeed * speedMultiplier
      const swing = Math.sin(walkCycle.current) * (isRunning ? 0.85 : 0.55)
      const bob = Math.abs(Math.sin(walkCycle.current)) * (isRunning ? 0.14 : 0.08)
      const forwardLean = isRunning ? 0.22 : 0.1

      if (bodyRef.current) {
        bodyRef.current.position.y = (0.95 + bob) * landingSquash.current
        bodyRef.current.scale.set(
          1 / Math.sqrt(landingSquash.current),
          landingSquash.current,
          1 / Math.sqrt(landingSquash.current)
        )
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, forwardLean, dt * 10)
        bodyRef.current.rotation.z = rollAngle.current + Math.sin(walkCycle.current * 0.5) * 0.06
      }

      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -swing * 0.9
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.15, dt * 8)
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = swing * 0.9
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.15, dt * 8)
      }
    } else {
      const idleBob = Math.sin(state.clock.elapsedTime * 2.2) * 0.02
      if (bodyRef.current) {
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 0.95 + idleBob, dt * 8)
        bodyRef.current.scale.set(1, 1, 1)
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, dt * 8)
        bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, 0, dt * 8)
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, dt * 10)
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, dt * 10)
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, dt * 10)
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.05, dt * 10)
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, dt * 10)
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.05, dt * 10)
      }
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

    // 9. GEM PICKUP
    for (const gem of GEMS) {
      if (collectedRef.current.has(gem.id)) continue
      const hd = Math.hypot(group.position.x - gem.x, group.position.z - gem.z)
      if (hd < 1.5) {
        const gemY = getTerrainHeight(gem.x, gem.z) + gem.y
        if (Math.abs(group.position.y - gemY) < 2.0) onCollectGem(gem.id)
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#050811" transparent opacity={0.4} />
      </mesh>

      <group ref={bodyRef} position={[0, 0.95, 0]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[0.45, 0.45, 0.45]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.4} />
        </mesh>

        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[0.47, 0.12, 0.47]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.3} />
        </mesh>

        <mesh ref={scarfRef} position={[0, 0.48, -0.22]} castShadow>
          <boxGeometry args={[0.38, 0.08, 0.35]} />
          <meshStandardMaterial color="#ef4444" roughness={0.5} />
        </mesh>

        <mesh position={[0, 0.65, 0.23]} castShadow>
          <boxGeometry args={[0.36, 0.12, 0.08]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} roughness={0.2} />
        </mesh>

        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.55, 0.6, 0.35]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>

        <mesh position={[0, 0.18, -0.22]} castShadow>
          <boxGeometry args={[0.38, 0.45, 0.18]} />
          <meshStandardMaterial color="#4f46e5" roughness={0.5} />
        </mesh>

        <group position={[-0.38, 0.35, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.16, 0.5, 0.18]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>

        <group position={[0.38, 0.35, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.16, 0.5, 0.18]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      </group>

      <group position={[-0.16, 0.55, 0]}>
        <mesh ref={leftLegRef} position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.18, 0.55, 0.2]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      <group position={[0.16, 0.55, 0]}>
        <mesh ref={rightLegRef} position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.18, 0.55, 0.2]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>
    </group>
  )
}
