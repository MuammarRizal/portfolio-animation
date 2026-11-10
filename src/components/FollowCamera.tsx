import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainHeight, type PlayerState } from '../game/world'

interface FollowCameraProps {
  playerRef: React.MutableRefObject<PlayerState>
  zoomInZone: boolean
  cameraYawRef: React.MutableRefObject<number>
}

/**
 * God of War: Ragnarok style elevated over-the-shoulder action camera.
 * Reads the player purely from a ref (no per-frame React state), and keeps the
 * camera above the terrain so it never clips through hills and mountains.
 */
export const FollowCamera: React.FC<FollowCameraProps> = ({ playerRef, zoomInZone, cameraYawRef }) => {
  const { camera, gl } = useThree()

  const currentPos = useRef(new THREE.Vector3(0, 12, 18))
  const currentLookAt = useRef(new THREE.Vector3(0, 1.2, 0))
  const autoYaw = useRef(0)
  const orbitOffset = useRef(0)
  const isDragging = useRef(false)
  const lastPointerX = useRef(0)
  const dragCooldown = useRef(0)

  useEffect(() => {
    const el = gl.domElement

    const onDown = (e: PointerEvent) => {
      isDragging.current = true
      lastPointerX.current = e.clientX
    }
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - lastPointerX.current
      lastPointerX.current = e.clientX
      orbitOffset.current -= dx * 0.006
      dragCooldown.current = 1.4
    }
    const onUp = () => {
      isDragging.current = false
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const { position: targetPosition, rotation: targetRotation, sprinting: isSprinting, airborne: isAirborne } =
      playerRef.current

    let headingDiff = targetRotation - (autoYaw.current + orbitOffset.current)
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2

    const gate = Math.max(0, Math.cos(headingDiff))

    if (dragCooldown.current > 0) {
      dragCooldown.current -= dt
    } else {
      autoYaw.current += headingDiff * dt * 2.6 * gate
    }

    const camYaw = autoYaw.current + orbitOffset.current
    cameraYawRef.current = camYaw

    const baseDist = zoomInZone ? 10.5 : 15.5
    const distance = isSprinting ? 18.5 : baseDist
    const pitch = zoomInZone ? 0.62 : 0.72
    const height = Math.sin(pitch) * distance
    const backDist = Math.cos(pitch) * distance

    const offsetX = -Math.sin(camYaw) * backDist
    const offsetZ = -Math.cos(camYaw) * backDist

    const targetY = targetPosition.y * 0.55 + height + 2.2

    const desiredX = targetPosition.x + offsetX
    const desiredZ = targetPosition.z + offsetZ
    let desiredY = targetY

    const posLerp = isAirborne ? 3.8 : 5.2
    currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, desiredX, dt * posLerp)
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, desiredY, dt * posLerp)
    currentPos.current.z = THREE.MathUtils.lerp(currentPos.current.z, desiredZ, dt * posLerp)

    // Keep camera above terrain
    const camGround = getTerrainHeight(currentPos.current.x, currentPos.current.z) + 2.5
    if (currentPos.current.y < camGround) {
      currentPos.current.y = camGround
      desiredY = camGround
    }

    const leadX = isSprinting ? Math.sin(camYaw) * 2.2 : 0
    const leadZ = isSprinting ? Math.cos(camYaw) * 2.2 : 0
    const aimY = targetPosition.y + (zoomInZone ? 1.6 : 1.25)

    currentLookAt.current.x = THREE.MathUtils.lerp(currentLookAt.current.x, targetPosition.x + leadX, dt * 6.5)
    currentLookAt.current.y = THREE.MathUtils.lerp(currentLookAt.current.y, aimY, dt * 6.5)
    currentLookAt.current.z = THREE.MathUtils.lerp(currentLookAt.current.z, targetPosition.z + leadZ, dt * 6.5)

    camera.position.copy(currentPos.current)
    camera.lookAt(currentLookAt.current)

    const perspectiveCam = camera as THREE.PerspectiveCamera
    if (perspectiveCam.isPerspectiveCamera) {
      const targetFov = isSprinting ? 56 : 48
      perspectiveCam.fov = THREE.MathUtils.lerp(perspectiveCam.fov, targetFov, dt * 3.5)
      perspectiveCam.updateProjectionMatrix()
    }
  })

  return null
}
