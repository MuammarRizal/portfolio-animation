import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getTerrainHeight, isGroundCoverAllowed } from '../game/world'

const MAX_RADIUS = 62

/** Deterministic RNG so grass + flowers land in the same spots every load. */
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GRASS_GREENS = ['#4d7c0f', '#5c8a2e', '#65a30d', '#79b41f', '#3f6212', '#84cc16', '#6aa03f']

interface Placement {
  x: number
  z: number
  rot: number
  scaleXZ: number
  scaleY: number
  tiltX: number
  tiltZ: number
}

// ---------------------------------------------------------------------------
// Grass
// ---------------------------------------------------------------------------

/**
 * One curved, tapering blade. Built from a plane whose vertices are pushed so
 * it bends forward and narrows toward the tip — never a straight spike.
 */
function makeBladeGeometry(height = 1, width = 0.085, segments = 4): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 1, segments)
  geo.translate(0, height / 2, 0)

  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getY(i) / height, 0, 1)
    // taper toward the tip
    pos.setX(i, pos.getX(i) * (1 - t * 0.88))
    // forward bend + a gentle S-curve so the silhouette is soft
    const bend = t * t * 0.3 - Math.sin(t * Math.PI) * 0.05 + t * 0.05
    pos.setZ(i, pos.getZ(i) + bend)
    // vertical gradient: dark base → bright tip (multiplies the per-tuft hue)
    const shade = 0.5 + t * 0.5
    colors[i * 3] = shade
    colors[i * 3 + 1] = shade
    colors[i * 3 + 2] = shade
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

/** A tuft: three blades fanned out at different angles and heights. */
function makeTuftGeometry(): THREE.BufferGeometry {
  const blade = makeBladeGeometry()
  const variants: Array<[number, number, number, number, number]> = [
    // [rotY, rotZ, scaleY, offX, offZ]
    [0, 0.1, 1.0, 0.02, 0],
    [2.2, -0.16, 0.78, -0.05, 0.03],
    [4.3, 0.13, 0.88, 0.04, -0.04],
  ]
  const parts = variants.map(([rotY, rotZ, sy, ox, oz]) => {
    const g = blade.clone()
    g.scale(1, sy, 1)
    g.rotateZ(rotZ)
    g.rotateY(rotY)
    g.translate(ox, 0, oz)
    return g
  })
  return mergeGeometries(parts) ?? blade
}

// ---------------------------------------------------------------------------
// Flowers
// ---------------------------------------------------------------------------

type FlowerType = 'daisy' | 'tulip' | 'cornflower' | 'buttercup'

const FLOWER_HEIGHT = 0.36

interface FlowerSpec {
  petals: number
  petalR: number
  ringR: number
  tilt: number
}

const FLOWER_SPECS: Record<FlowerType, FlowerSpec> = {
  daisy: { petals: 6, petalR: 0.052, ringR: 0.055, tilt: 0.36 },
  tulip: { petals: 5, petalR: 0.062, ringR: 0.042, tilt: 0.62 },
  cornflower: { petals: 5, petalR: 0.046, ringR: 0.05, tilt: 0.42 },
  buttercup: { petals: 5, petalR: 0.05, ringR: 0.046, tilt: 0.5 },
}

const FLOWER_COLORS: Record<FlowerType, string> = {
  daisy: '#ffffff',
  tulip: '#ef4444',
  cornflower: '#3b82f6',
  buttercup: '#facc15',
}

/** A ring of petal discs, tilted up into a shallow bowl. Sits at the stem top. */
function makePetalRing(spec: FlowerSpec): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < spec.petals; i++) {
    const a = (i / spec.petals) * Math.PI * 2
    const g = new THREE.CircleGeometry(spec.petalR, 5)
    g.rotateX(-Math.PI / 2)
    g.translate(spec.ringR, 0, 0)
    g.rotateZ(spec.tilt)
    g.rotateY(a)
    g.translate(0, FLOWER_HEIGHT, 0)
    parts.push(g)
  }
  return mergeGeometries(parts) ?? parts[0]
}

function makeStemGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.012, 0.022, FLOWER_HEIGHT, 4)
  g.translate(0, FLOWER_HEIGHT / 2, 0)
  return g
}

function makeCenterGeometry(): THREE.BufferGeometry {
  // Low-poly icosahedron reads as a pollen disc and costs a third of a sphere.
  const g = new THREE.IcosahedronGeometry(0.038, 0)
  g.translate(0, FLOWER_HEIGHT + 0.012, 0)
  return g
}

// ---------------------------------------------------------------------------
// Wind shader
// ---------------------------------------------------------------------------

interface WindUniforms {
  uTime: { value: number }
  uWind: { value: number }
}

/** Patch a standard material's vertex shader with a wind sway scaled by height. */
function applyWind(mat: THREE.MeshStandardMaterial, uniforms: React.MutableRefObject<WindUniforms>, amp: number) {
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
          float h = clamp(position.y, 0.0, 3.0);
          float phase = iPos.x * 0.28 + iPos.z * 0.24;
          float gust = sin(uTime * 0.35 + iPos.x * 0.02 + iPos.z * 0.017) * 0.5 + 0.5;
          float sway = sin(uTime * 1.5 + phase) * ${amp.toFixed(3)} * uWind;
          float ripple = sin(uTime * 4.2 + phase * 2.3) * ${(amp * 0.35).toFixed(3)} * uWind;
          transformed.x += (sway + ripple) * (0.5 + gust) * h;
          transformed.z += (sway * 0.55 + ripple * 0.4) * (0.5 + gust) * h;
        #endif
        `
      )
  }
  mat.customProgramCacheKey = () => `wind_${amp}`
}

/** Fill an instanced mesh from placements, optionally tinting each instance. */
function fillMesh(
  mesh: THREE.InstancedMesh | null,
  items: Placement[],
  colors?: string[]
): void {
  if (!mesh) return
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    dummy.position.set(it.x, getTerrainHeight(it.x, it.z), it.z)
    dummy.rotation.set(it.tiltX, it.rot, it.tiltZ)
    dummy.scale.set(it.scaleXZ, it.scaleY, it.scaleXZ)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    if (colors) {
      color.set(colors[i % colors.length])
      mesh.setColorAt(i, color)
    }
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

// ---------------------------------------------------------------------------

interface FlowerInstance extends Placement {
  type: FlowerType
}

/**
 * Instanced ground cover: curved grass tufts plus scattered wildflowers.
 * Everything is placed with the same deterministic seed so grass and flowers
 * always agree, and split into a handful of instanced batches (one draw call
 * each for thousands of blades).
 */
export const GrassField: React.FC<{ count?: number; flowerCount?: number }> = ({
  count = 4000,
  flowerCount,
}) => {
  const flowerTotal = flowerCount ?? Math.round(count * 0.24)

  const grassRef = useRef<THREE.InstancedMesh>(null!)
  const stemRef = useRef<THREE.InstancedMesh>(null!)
  const centerRef = useRef<THREE.InstancedMesh>(null!)
  const petalRefs = {
    daisy: useRef<THREE.InstancedMesh>(null!),
    tulip: useRef<THREE.InstancedMesh>(null!),
    cornflower: useRef<THREE.InstancedMesh>(null!),
    buttercup: useRef<THREE.InstancedMesh>(null!),
  }

  const uniforms = useRef<WindUniforms>({ uTime: { value: 0 }, uWind: { value: 1 } })

  const grassGeo = useMemo(() => makeTuftGeometry(), [])
  const flowerGeos = useMemo(
    () => ({
      daisy: makePetalRing(FLOWER_SPECS.daisy),
      tulip: makePetalRing(FLOWER_SPECS.tulip),
      cornflower: makePetalRing(FLOWER_SPECS.cornflower),
      buttercup: makePetalRing(FLOWER_SPECS.buttercup),
      stem: makeStemGeometry(),
      center: makeCenterGeometry(),
    }),
    []
  )

  const grassMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      metalness: 0,
      vertexColors: true,
      side: THREE.DoubleSide,
    })
    applyWind(m, uniforms, 0.16)
    return m
  }, [])

  const flowerMats = useMemo(() => {
    const petal = (hex: string) => {
      const m = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.7,
        side: THREE.DoubleSide,
      })
      applyWind(m, uniforms, 0.07)
      return m
    }
    const stem = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.9 })
    const center = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.6 })
    applyWind(stem, uniforms, 0.07)
    applyWind(center, uniforms, 0.07)
    return {
      daisy: petal(FLOWER_COLORS.daisy),
      tulip: petal(FLOWER_COLORS.tulip),
      cornflower: petal(FLOWER_COLORS.cornflower),
      buttercup: petal(FLOWER_COLORS.buttercup),
      stem,
      center,
    }
  }, [])

  // ---- deterministic placement ----
  const grassData = useMemo<Placement[]>(() => {
    const rng = mulberry32(20260110)
    const out: Placement[] = []
    let guard = 0
    while (out.length < count && guard < count * 8) {
      guard++
      const a = rng() * Math.PI * 2
      const r = Math.sqrt(rng()) * MAX_RADIUS
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.hypot(x, z) > MAX_RADIUS) continue
      if (!isGroundCoverAllowed(x, z)) continue
      if (getTerrainHeight(x, z) > 6) continue // no grass up the mountains
      out.push({
        x,
        z,
        rot: rng() * Math.PI * 2,
        scaleXZ: 0.7 + rng() * 1.0,
        scaleY: 0.7 + rng() * 1.0,
        tiltX: (rng() - 0.5) * 0.22,
        tiltZ: (rng() - 0.5) * 0.22,
      })
    }
    return out
  }, [count])

  const grassColors = useMemo(
    () => grassData.map((_, i) => GRASS_GREENS[(i * 7 + (i % 3)) % GRASS_GREENS.length]),
    [grassData]
  )

  const flowers = useMemo<FlowerInstance[]>(() => {
    const rng = mulberry32(913377)
    const types: FlowerType[] = ['daisy', 'tulip', 'cornflower', 'buttercup']
    const out: FlowerInstance[] = []
    let guard = 0
    while (out.length < flowerTotal && guard < flowerTotal * 12) {
      guard++
      const a = rng() * Math.PI * 2
      const r = Math.sqrt(rng()) * MAX_RADIUS
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.hypot(x, z) > MAX_RADIUS) continue
      if (!isGroundCoverAllowed(x, z)) continue
      if (getTerrainHeight(x, z) > 5.5) continue
      out.push({
        x,
        z,
        rot: rng() * Math.PI * 2,
        scaleXZ: 0.75 + rng() * 0.6,
        scaleY: 0.75 + rng() * 0.7,
        tiltX: (rng() - 0.5) * 0.18,
        tiltZ: (rng() - 0.5) * 0.18,
        type: types[Math.floor(rng() * types.length)],
      })
    }
    return out
  }, [flowerTotal])

  const flowersByType = useMemo(
    () => ({
      daisy: flowers.filter((f) => f.type === 'daisy'),
      tulip: flowers.filter((f) => f.type === 'tulip'),
      cornflower: flowers.filter((f) => f.type === 'cornflower'),
      buttercup: flowers.filter((f) => f.type === 'buttercup'),
    }),
    [flowers]
  )

  useEffect(() => {
    fillMesh(grassRef.current, grassData, grassColors)
    fillMesh(stemRef.current, flowers)
    fillMesh(centerRef.current, flowers)
    fillMesh(petalRefs.daisy.current, flowersByType.daisy)
    fillMesh(petalRefs.tulip.current, flowersByType.tulip)
    fillMesh(petalRefs.cornflower.current, flowersByType.cornflower)
    fillMesh(petalRefs.buttercup.current, flowersByType.buttercup)
  }, [grassData, grassColors, flowers, flowersByType])

  useFrame((state) => {
    uniforms.current.uTime.value = state.clock.elapsedTime
  })

  const flowerSpecies: FlowerType[] = ['daisy', 'tulip', 'cornflower', 'buttercup']

  return (
    <group>
      {/* grass tufts */}
      {grassData.length > 0 && (
        <instancedMesh
          ref={grassRef}
          args={[grassGeo, grassMat, grassData.length]}
          castShadow={false}
          receiveShadow={false}
          frustumCulled={false}
        />
      )}

      {/* wildflowers: shared stems + centres, one petal batch per species */}
      {flowers.length > 0 && (
        <>
          <instancedMesh
            ref={stemRef}
            args={[flowerGeos.stem, flowerMats.stem, flowers.length]}
            castShadow={false}
            receiveShadow={false}
            frustumCulled={false}
          />
          <instancedMesh
            ref={centerRef}
            args={[flowerGeos.center, flowerMats.center, flowers.length]}
            castShadow={false}
            receiveShadow={false}
            frustumCulled={false}
          />
        </>
      )}
      {flowerSpecies.map((type) =>
        flowersByType[type].length > 0 ? (
          <instancedMesh
            key={type}
            ref={petalRefs[type]}
            args={[flowerGeos[type], flowerMats[type], flowersByType[type].length]}
            castShadow={false}
            receiveShadow={false}
            frustumCulled={false}
          />
        ) : null
      )}
    </group>
  )
}
