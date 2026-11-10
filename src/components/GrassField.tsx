import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { distanceToPath, getTerrainHeight } from '../game/world'

// Keep grass away from the spawn plaza and the 4 realm outposts
const FORBIDDEN = [
  { x: 0, z: 0, r: 7 },
  { x: -36, z: -32, r: 9 },
  { x: 36, z: -32, r: 9 },
  { x: -36, z: 36, r: 9 },
  { x: 36, z: 36, r: 9 },
]

const MAX_RADIUS = 62

/**
 * Instanced grass field with a wind sway injected into the vertex shader.
 * One draw call for thousands of blades, each sitting on the terrain surface.
 */
export const GrassField: React.FC<{ count?: number }> = ({ count = 4000 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const uniforms = useRef({ uTime: { value: 0 }, uWind: { value: 1 } })

  const geometry = useMemo(() => {
    // Tapered blade (thin cone) with its base at y = 0
    const geo = new THREE.ConeGeometry(0.07, 0.8, 3, 1)
    geo.translate(0, 0.4, 0)
    return geo
  }, [])

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      metalness: 0,
      vertexColors: true,
    })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.current.uTime
      shader.uniforms.uWind = uniforms.current.uWind
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 iPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
            float h = max(position.y, 0.0);
            float sway = sin(uTime * 1.6 + iPos.x * 0.3 + iPos.z * 0.28) * 0.13 * uWind;
            float sway2 = sin(uTime * 3.1 + iPos.z * 0.5) * 0.05 * uWind;
            transformed.x += (sway + sway2) * h;
            transformed.z += (sway * 0.6) * h;
          #endif
          `
        )
    }
    return mat
  }, [])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    const greens = ['#4d7c0f', '#5c8a2e', '#65a30d', '#79b41f', '#3f6212', '#84cc16']

    let placed = 0
    let guard = 0
    while (placed < count && guard < count * 8) {
      guard++
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * MAX_RADIUS
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.hypot(x, z) > MAX_RADIUS) continue
      if (FORBIDDEN.some((f) => Math.hypot(x - f.x, z - f.z) < f.r)) continue
      if (distanceToPath(x, z) < 2.6) continue

      const y = getTerrainHeight(x, z)
      if (y > 7) continue // no grass up the mountains

      dummy.position.set(x, y, z)
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0)
      const s = 0.7 + Math.random() * 1.0
      dummy.scale.set(s, s * (0.7 + Math.random() * 0.9), s)
      dummy.updateMatrix()
      mesh.setMatrixAt(placed, dummy.matrix)

      color.set(greens[Math.floor(Math.random() * greens.length)])
      mesh.setColorAt(placed, color)
      placed++
    }

    // Fill remaining slots (if guard tripped) with tiny hidden blades
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = placed; i < count; i++) {
      mesh.setMatrixAt(i, hidden)
      mesh.setColorAt(i, color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [count])

  useFrame((state) => {
    uniforms.current.uTime.value = state.clock.elapsedTime
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow={false}
      receiveShadow={false}
      frustumCulled={false}
    />
  )
}
