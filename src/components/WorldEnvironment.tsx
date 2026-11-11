import React, { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { type HousePalette, type HouseRoof } from '../data/portfolio'
import { GrassField } from './GrassField'
import type { BiomePalette } from '../game/maps'
import { HOUSE_D, HOUSE_H, HOUSE_W, type Decoration, type World } from '../game/world'

interface WorldEnvironmentProps {
  world: World
  collectedIds: number[]
  grassCount?: number
  flowerCount?: number
  /** When false the expensive ground cover is skipped (island is far away). */
  detail?: boolean
}

const Y_AXIS = new THREE.Vector3(0, 1, 0)

/** Minimal placement record: a world transform one InstancedMesh instance needs. */
interface Placement {
  x: number
  y: number
  z: number
  scale: number
  rot: number
}

/** House placement carries the batch keys used to split it into instanced parts. */
interface HousePlacement extends Placement {
  roof: HouseRoof
  palette: HousePalette
}

// ---- shared geometries (baked local offsets so scale grows from the ground) ----
const G = {
  trunk: (() => {
    const g = new THREE.CylinderGeometry(0.28, 0.42, 1.8, 6)
    g.translate(0, 0.9, 0)
    return g
  })(),
  leaf1: (() => {
    const g = new THREE.ConeGeometry(1.6, 2.0, 6)
    g.translate(0, 2.3, 0)
    return g
  })(),
  leaf2: (() => {
    const g = new THREE.ConeGeometry(1.15, 1.7, 6)
    g.translate(0, 3.5, 0)
    return g
  })(),
  rock: (() => {
    const g = new THREE.DodecahedronGeometry(0.9, 0)
    g.translate(0, 0.55, 0)
    return g
  })(),
  ruin: (() => {
    const g = new THREE.BoxGeometry(0.7, 3.4, 0.7)
    g.translate(0, 1.7, 0)
    return g
  })(),
  rune: (() => {
    const g = new THREE.PlaneGeometry(0.24, 2.2)
    g.translate(0, 1.7, 0.37)
    return g
  })(),
  lanternPost: (() => {
    const g = new THREE.CylinderGeometry(0.11, 0.15, 1.6, 6)
    g.translate(0, 0.8, 0)
    return g
  })(),
  lanternOrb: (() => {
    const g = new THREE.SphereGeometry(0.22, 10, 10)
    g.translate(0, 1.7, 0)
    return g
  })(),
  stone: (() => {
    const g = new THREE.BoxGeometry(1.25, 3.4, 0.8)
    g.translate(0, 1.7, 0)
    return g
  })(),
  // Archway parts: local offsets baked in so one instance = one whole part placed at an archway origin.
  archPillarL: (() => {
    const g = new THREE.BoxGeometry(1.0, 6, 1.0)
    g.translate(-2.4, 3, 0)
    return g
  })(),
  archPillarR: (() => {
    const g = new THREE.BoxGeometry(1.0, 6, 1.0)
    g.translate(2.4, 3, 0)
    return g
  })(),
  archLintel: (() => {
    const g = new THREE.BoxGeometry(6.4, 0.9, 1.2)
    g.translate(0, 6.3, 0)
    return g
  })(),
  archBanner: (() => {
    const g = new THREE.PlaneGeometry(3.6, 0.3)
    g.translate(0, 6.3, 0.65)
    return g
  })(),
  // ---- village houses (base size HOUSE_W × HOUSE_D × HOUSE_H, origin at ground) ----
  houseBody: (() => {
    const g = new THREE.BoxGeometry(HOUSE_W, HOUSE_H, HOUSE_D)
    g.translate(0, HOUSE_H / 2, 0)
    return g
  })(),
  // Gable roof: two slanted slabs meeting at a ridge along Z.
  houseGableL: (() => {
    const g = new THREE.BoxGeometry(2.95, 0.26, HOUSE_D + 0.7)
    g.rotateZ(0.7086)
    g.translate(-1.05, HOUSE_H + 0.9, 0)
    return g
  })(),
  houseGableR: (() => {
    const g = new THREE.BoxGeometry(2.95, 0.26, HOUSE_D + 0.7)
    g.rotateZ(-0.7086)
    g.translate(1.05, HOUSE_H + 0.9, 0)
    return g
  })(),
  // Hip roof: 4-sided pyramid, rotated so its faces align with the box walls.
  houseHip: (() => {
    const g = new THREE.ConeGeometry(3.5, 2.3, 4)
    g.rotateY(Math.PI / 4)
    g.translate(0, HOUSE_H + 1.15, 0)
    return g
  })(),
  // Tower roof: taller octagonal spire.
  houseTower: (() => {
    const g = new THREE.ConeGeometry(3.1, 3.2, 8)
    g.translate(0, HOUSE_H + 1.6, 0)
    return g
  })(),
  houseDoor: (() => {
    const g = new THREE.BoxGeometry(1.1, 1.95, 0.18)
    g.translate(0, 0.98, HOUSE_D / 2 + 0.05)
    return g
  })(),
  houseWindowL: (() => {
    const g = new THREE.BoxGeometry(0.85, 0.85, 0.14)
    g.translate(-1.35, 2.0, HOUSE_D / 2 + 0.04)
    return g
  })(),
  houseWindowR: (() => {
    const g = new THREE.BoxGeometry(0.85, 0.85, 0.14)
    g.translate(1.35, 2.0, HOUSE_D / 2 + 0.04)
    return g
  })(),
  houseChimney: (() => {
    const g = new THREE.BoxGeometry(0.55, 1.6, 0.55)
    g.translate(1.5, HOUSE_H + 1.1, -1.3)
    return g
  })(),
}

/**
 * Materials for one island. Everything that should follow the biome (foliage,
 * stone, ruins) is driven by the palette, so the same geometry reads as a warm
 * green realm or a frozen one. Created once per world and shared by its batches.
 */
function buildMaterials(p: BiomePalette) {
  return {
    trunk: new THREE.MeshStandardMaterial({ color: p.trunk, roughness: 0.85 }),
    leaf1: new THREE.MeshStandardMaterial({ color: p.foliage[0], roughness: 0.6, flatShading: true }),
    leaf2: new THREE.MeshStandardMaterial({ color: p.foliage[1], roughness: 0.5, flatShading: true }),
    rock: new THREE.MeshStandardMaterial({ color: p.rock, roughness: 0.9, flatShading: true }),
    ruin: new THREE.MeshStandardMaterial({ color: p.cliff, roughness: 0.8 }),
    rune: new THREE.MeshStandardMaterial({
      color: '#a855f7',
      emissive: '#7c3aed',
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
    }),
    lanternPost: new THREE.MeshStandardMaterial({ color: p.rock, roughness: 0.7 }),
    lanternOrb: new THREE.MeshStandardMaterial({ color: '#fcd34d', emissive: '#f59e0b', emissiveIntensity: 1.4 }),
    stone: new THREE.MeshStandardMaterial({ color: p.rock, roughness: 0.9, flatShading: true }),
    archPillar: new THREE.MeshStandardMaterial({ color: p.rock, roughness: 0.85, flatShading: true }),
    archLintel: new THREE.MeshStandardMaterial({ color: p.cliff, roughness: 0.8, flatShading: true }),
    archBanner: new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 1 }),
    // ---- village house palette ----
    wallWood: new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: 0.85, flatShading: true }),
    wallStone: new THREE.MeshStandardMaterial({ color: '#9aa3ad', roughness: 0.9, flatShading: true }),
    wallPlaster: new THREE.MeshStandardMaterial({ color: '#e6d9c3', roughness: 0.9 }),
    roofGable: new THREE.MeshStandardMaterial({ color: '#b4463a', roughness: 0.8, flatShading: true }),
    roofHip: new THREE.MeshStandardMaterial({ color: '#8a5a3b', roughness: 0.82, flatShading: true }),
    roofTower: new THREE.MeshStandardMaterial({ color: '#5d7f9e', roughness: 0.78, flatShading: true }),
    houseDoor: new THREE.MeshStandardMaterial({ color: '#5a3b22', roughness: 0.8 }),
    houseWindow: new THREE.MeshStandardMaterial({
      color: '#ffd77a',
      emissive: '#f59e0b',
      emissiveIntensity: 1.1,
      roughness: 0.4,
    }),
    houseChimney: new THREE.MeshStandardMaterial({ color: p.cliff, roughness: 0.9, flatShading: true }),
  }
}

/** One instanced draw call for a batch of identical decorations. */
const InstancedBatch: React.FC<{
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: Placement[]
  castShadow?: boolean
}> = ({ geometry, material, items, castShadow = true }) => {
  const ref = useRef<THREE.InstancedMesh>(null!)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      q.setFromAxisAngle(Y_AXIS, it.rot)
      p.set(it.x, it.y, it.z)
      s.setScalar(it.scale)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items, geometry])

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow
    />
  )
}

export const WorldEnvironment: React.FC<WorldEnvironmentProps> = ({
  world,
  collectedIds,
  grassCount = 4000,
  flowerCount,
  detail = true,
}) => {
  const gemsGroupRef = useRef<THREE.Group>(null)

  const def = world.def
  const palette = def.palette
  const [ox, oz] = def.origin

  const terrainRadius = def.terrainRadius
  const boundaryRadius = def.boundaryRadius
  const terrainSize = terrainRadius * 2 + 30

  const M = useMemo(() => buildMaterials(palette), [palette])

  const C_GRASS = useMemo(() => new THREE.Color(palette.ground), [palette])
  const C_GRASS_LIGHT = useMemo(() => new THREE.Color(palette.groundLight), [palette])
  const C_PATH = useMemo(() => new THREE.Color(palette.path), [palette])
  const C_SAND = useMemo(() => new THREE.Color(palette.sand), [palette])
  const C_ROCK = useMemo(() => new THREE.Color(palette.rock), [palette])
  const C_SNOW = useMemo(() => new THREE.Color(palette.snow), [palette])
  const C_CLIFF = useMemo(() => new THREE.Color(palette.cliff), [palette])

  // Island-local content (gems, houses, archways are authored relative to origin).
  const gems = def.gems

  useFrame((state, delta) => {
    const grp = gemsGroupRef.current
    if (!grp) return
    const t = state.clock.elapsedTime
    grp.children.forEach((child, idx) => {
      child.rotation.y += delta * 1.5
      const baseY = (child.userData.baseY as number) ?? 1.5
      child.position.y = baseY + Math.sin(t * 3 + idx) * 0.18
    })
  })

  const parts = useMemo(
    () => ({
      tree: world.decorations.filter((d) => d.type === 'tree'),
      rock: world.decorations.filter((d) => d.type === 'rock'),
      ruin: world.decorations.filter((d) => d.type === 'ruin'),
      lantern: world.decorations.filter((d) => d.type === 'lantern'),
    }),
    [world]
  )

  // Archways as instanced parts: one batch per part type instead of 4 meshes per arch.
  const archItems = useMemo<Placement[]>(
    () =>
      def.archways.map((a) => ({
        x: a.x,
        y: world.terrainAt(a.x, a.z),
        z: a.z,
        scale: 1,
        rot: a.rot,
      })),
    [def, world]
  )

  // Village houses: one placement per house, then split into instanced batches
  // by palette / roof so the whole village costs ~11 draw calls total.
  const houseItems = useMemo<HousePlacement[]>(
    () =>
      def.houses.map((h) => ({
        x: h.x,
        y: world.terrainAt(h.x, h.z),
        z: h.z,
        scale: h.scale,
        rot: h.rot,
        roof: h.roof,
        palette: h.palette,
      })),
    [def, world]
  )
  const houseByPalette = useMemo(
    () => ({
      wood: houseItems.filter((h) => h.palette === 'wood'),
      stone: houseItems.filter((h) => h.palette === 'stone'),
      plaster: houseItems.filter((h) => h.palette === 'plaster'),
    }),
    [houseItems]
  )
  const houseByRoof = useMemo(
    () => ({
      gable: houseItems.filter((h) => h.roof === 'gable'),
      hip: houseItems.filter((h) => h.roof === 'hip'),
      tower: houseItems.filter((h) => h.roof === 'tower'),
    }),
    [houseItems]
  )

  // Standing-stone ring marking the walkable boundary
  const boundaryStones = useMemo<Decoration[]>(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const a = (i / 46) * Math.PI * 2
        const r = boundaryRadius + 1.4
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        return {
          type: 'rock',
          x,
          y: world.terrainAt(x, z),
          z,
          scale: 1.15 + ((i * 29) % 7) / 12,
          rot: a + 0.25,
        }
      }),
    [boundaryRadius, world]
  )

  // Terrain surface: displaced plane, vertex-coloured grass / road / rock / snow,
  // edges dropped into cliffs so the island reads as floating.
  const terrainGeo = useMemo(() => {
    const seg = 120
    const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, seg, seg)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const tmp = new THREE.Color()
    const half = terrainSize * 0.5
    const rockHeight = palette.rockHeight
    const snowHeight = palette.snowHeight

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const r = Math.hypot(x, z)
      const terrainY = world.terrainAt(x, z)

      let cliff = 0
      if (r > terrainRadius) {
        const t = Math.min(1, (r - terrainRadius) / (half - terrainRadius))
        cliff = t * t * 44
      }
      pos.setY(i, terrainY - cliff)

      tmp.copy(C_GRASS)
      const n = (Math.sin(x * 0.6) * Math.cos(z * 0.7) + 1) * 0.5
      tmp.lerp(C_GRASS_LIGHT, n * 0.55)

      const pd = world.distanceToPath(x, z)
      if (pd < 2.8 && r < terrainRadius) tmp.lerp(C_PATH, 1 - pd / 2.8)

      if (r > terrainRadius - 5 && r <= terrainRadius) {
        tmp.lerp(C_SAND, ((r - (terrainRadius - 5)) / 5) * 0.6)
      }
      if (cliff > 0) tmp.lerp(C_CLIFF, Math.min(1, cliff / 12))
      if (terrainY > rockHeight) tmp.lerp(C_ROCK, Math.min(1, (terrainY - rockHeight) / 7))
      if (terrainY > snowHeight) tmp.lerp(C_SNOW, Math.min(1, (terrainY - snowHeight) / 4))

      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [terrainSize, terrainRadius, world, palette, C_GRASS, C_GRASS_LIGHT, C_PATH, C_SAND, C_CLIFF, C_ROCK, C_SNOW])

  return (
    <group position={[ox, 0, oz]}>
      {/* 1. TERRAIN SURFACE */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>

      {/* Floating island underside (inverted rock cone) */}
      <mesh position={[0, -27, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[terrainRadius + 1, 46, 24]} />
        <meshStandardMaterial color={palette.cliff} roughness={0.95} flatShading />
      </mesh>

      {/* 2. BOUNDARY: standing-stone ring + translucent energy wall */}
      <InstancedBatch geometry={G.stone} material={M.stone} items={boundaryStones} castShadow={false} />
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[boundaryRadius, boundaryRadius, 12, 72, 1, true]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boundaryRadius - 0.35, boundaryRadius + 0.35, 96]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* 3. WIND-SWEPT GRASS (only drawn when the island is close enough) */}
      {detail && <GrassField world={world} count={grassCount} flowerCount={flowerCount} />}

      {/* 4. CENTRAL SPAWN SANCTUARY */}
      <mesh receiveShadow position={[0, 0.05, 0]}>
        <circleGeometry args={[6.5, 40]} />
        <meshStandardMaterial color={palette.sand} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.7, 6.1, 40]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.0, 3.3, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} />
      </mesh>

      {/* 5. NORSE-STYLE STONE ARCHWAYS ALONG THE ROADS (instanced: 4 batches, not 4 meshes per arch) */}
      <InstancedBatch geometry={G.archPillarL} material={M.archPillar} items={archItems} />
      <InstancedBatch geometry={G.archPillarR} material={M.archPillar} items={archItems} />
      <InstancedBatch geometry={G.archLintel} material={M.archLintel} items={archItems} />
      <InstancedBatch geometry={G.archBanner} material={M.archBanner} items={archItems} castShadow={false} />

      {/* 5b. VILLAGE HOUSES (solid — mini-zones, not enterable). Instanced parts. */}
      {houseByPalette.wood.length > 0 && (
        <InstancedBatch geometry={G.houseBody} material={M.wallWood} items={houseByPalette.wood} />
      )}
      {houseByPalette.stone.length > 0 && (
        <InstancedBatch geometry={G.houseBody} material={M.wallStone} items={houseByPalette.stone} />
      )}
      {houseByPalette.plaster.length > 0 && (
        <InstancedBatch geometry={G.houseBody} material={M.wallPlaster} items={houseByPalette.plaster} />
      )}
      {houseByRoof.gable.length > 0 && (
        <>
          <InstancedBatch geometry={G.houseGableL} material={M.roofGable} items={houseByRoof.gable} />
          <InstancedBatch geometry={G.houseGableR} material={M.roofGable} items={houseByRoof.gable} />
        </>
      )}
      {houseByRoof.hip.length > 0 && (
        <InstancedBatch geometry={G.houseHip} material={M.roofHip} items={houseByRoof.hip} />
      )}
      {houseByRoof.tower.length > 0 && (
        <InstancedBatch geometry={G.houseTower} material={M.roofTower} items={houseByRoof.tower} />
      )}
      {houseItems.length > 0 && (
        <>
          <InstancedBatch geometry={G.houseDoor} material={M.houseDoor} items={houseItems} />
          <InstancedBatch geometry={G.houseWindowL} material={M.houseWindow} items={houseItems} castShadow={false} />
          <InstancedBatch geometry={G.houseWindowR} material={M.houseWindow} items={houseItems} castShadow={false} />
          <InstancedBatch geometry={G.houseChimney} material={M.houseChimney} items={houseItems} />
        </>
      )}

      {/* 6. STEPPING-STONE ELEVATIONS */}
      <group position={[0, world.terrainAt(0, -22), -22]}>
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.0, 2.3, 1.0, 8]} />
          <meshStandardMaterial color={palette.rock} roughness={0.75} flatShading />
        </mesh>
        <mesh castShadow receiveShadow position={[-4.5, 1.2, -3]}>
          <cylinderGeometry args={[1.6, 1.9, 2.4, 8]} />
          <meshStandardMaterial color={palette.rock} roughness={0.75} flatShading />
        </mesh>
        <mesh castShadow receiveShadow position={[4.5, 1.2, -3]}>
          <cylinderGeometry args={[1.6, 1.9, 2.4, 8]} />
          <meshStandardMaterial color={palette.rock} roughness={0.75} flatShading />
        </mesh>
      </group>
      <group position={[0, world.terrainAt(0, 22), 22]}>
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.0, 2.3, 1.0, 8]} />
          <meshStandardMaterial color={palette.rock} roughness={0.75} flatShading />
        </mesh>
      </group>

      {/* 7. DECORATIONS (instanced — ~8 draw calls for the whole realm) */}
      {parts.tree.length > 0 && (
        <>
          <InstancedBatch geometry={G.trunk} material={M.trunk} items={parts.tree} />
          <InstancedBatch geometry={G.leaf1} material={M.leaf1} items={parts.tree} />
          <InstancedBatch geometry={G.leaf2} material={M.leaf2} items={parts.tree} />
        </>
      )}
      {parts.rock.length > 0 && <InstancedBatch geometry={G.rock} material={M.rock} items={parts.rock} />}
      {parts.ruin.length > 0 && (
        <>
          <InstancedBatch geometry={G.ruin} material={M.ruin} items={parts.ruin} />
          <InstancedBatch geometry={G.rune} material={M.rune} items={parts.ruin} castShadow={false} />
        </>
      )}
      {parts.lantern.length > 0 && (
        <>
          <InstancedBatch geometry={G.lanternPost} material={M.lanternPost} items={parts.lantern} />
          <InstancedBatch
            geometry={G.lanternOrb}
            material={M.lanternOrb}
            items={parts.lantern}
            castShadow={false}
          />
        </>
      )}

      {/* 8. COLLECTIBLE GEMS (emissive glow, no point lights) */}
      <group ref={gemsGroupRef}>
        {gems.map((gem) => {
          if (collectedIds.includes(gem.id)) return null
          const y = world.terrainAt(gem.x, gem.z) + gem.y
          return (
            <group key={gem.id} position={[gem.x, y, gem.z]} userData={{ baseY: y }}>
              <mesh castShadow>
                <octahedronGeometry args={[0.45, 0]} />
                <meshStandardMaterial
                  color={gem.color}
                  emissive={gem.color}
                  emissiveIntensity={1.1}
                  roughness={0.1}
                />
              </mesh>
              <mesh scale={1.7}>
                <octahedronGeometry args={[0.45, 0]} />
                <meshBasicMaterial color={gem.color} transparent opacity={0.18} depthWrite={false} />
              </mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}
