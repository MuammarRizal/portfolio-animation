import { useState, useEffect, useRef, useCallback, useMemo, memo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import confetti from 'canvas-confetti'

import { useKeyboard, type KeyState } from './hooks/useKeyboard'
import { Character } from './components/Character'
import { FollowCamera } from './components/FollowCamera'
import { ZonePlatform } from './components/ZonePlatform'
import { WorldEnvironment } from './components/WorldEnvironment'
import { Wildlife } from './components/Wildlife'
import { NpcVillagers } from './components/NpcVillagers'
import { GameUI } from './components/GameUI'
import { PortfolioModal } from './components/PortfolioModal'
import { LoadingScreen } from './components/LoadingScreen'
import { ZONES, GEMS, type ZoneData } from './data/portfolio'
import { DEFAULT_CHARACTER_ID, getCharacter, type CharacterPreset } from './game/characters'
import type { QuestState } from './components/QuestTracker'
import { getTerrainHeight, type PlayerState } from './game/world'

type Quality = 'high' | 'low'

/** Sun that keeps its shadow frustum tight around the player (cheap shadows). */
const SunLight: React.FC<{ playerRef: React.MutableRefObject<PlayerState>; quality: Quality }> = ({
  playerRef,
  quality,
}) => {
  const ref = useRef<THREE.DirectionalLight>(null!)
  const size = quality === 'low' ? 16 : 26

  useFrame(() => {
    const light = ref.current
    if (!light) return
    const p = playerRef.current.position
    light.position.set(p.x + 70, 92, p.z + 40)
    light.target.position.set(p.x, 0, p.z)
    light.target.updateMatrixWorld()
  })

  return (
    <directionalLight
      ref={ref}
      castShadow
      intensity={2.7}
      color="#fff6e0"
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-near={1}
      shadow-camera-far={240}
      shadow-camera-left={-size}
      shadow-camera-right={size}
      shadow-camera-top={size}
      shadow-camera-bottom={-size}
      shadow-bias={-0.0008}
    />
  )
}

/** Fires once the scene has actually painted a few frames (post-suspense). */
const SceneReadyProbe: React.FC<{ onReady: () => void; frames?: number }> = ({ onReady, frames = 3 }) => {
  const count = useRef(0)
  const done = useRef(false)

  useFrame(() => {
    if (done.current) return
    count.current += 1
    if (count.current >= frames) {
      done.current = true
      onReady()
    }
  })

  return null
}

interface SceneProps {
  character: CharacterPreset
  keys: React.MutableRefObject<KeyState>
  playerRef: React.MutableRefObject<PlayerState>
  cameraYawRef: React.MutableRefObject<number>
  collectedRef: React.MutableRefObject<Set<number>>
  collectedGems: number[]
  activeZone: ZoneData | null
  modalZone: ZoneData | null
  quality: Quality
  virtualInputRef: React.MutableRefObject<{ x: number; y: number }>
  virtualJumpRef: React.MutableRefObject<boolean>
  virtualSprintRef: React.MutableRefObject<boolean>
  attackRef: React.MutableRefObject<boolean>
  onZoneChange: (zone: ZoneData | null) => void
  onCollectGem: (id: number) => void
  onOpenZone: (zone: ZoneData) => void
  onHunt: () => void
  onSceneReady: () => void
}

const Scene = memo(function Scene(props: SceneProps) {
  const {
    character,
    keys,
    playerRef,
    cameraYawRef,
    collectedRef,
    collectedGems,
    activeZone,
    modalZone,
    quality,
    virtualInputRef,
    virtualJumpRef,
    virtualSprintRef,
    attackRef,
    onZoneChange,
    onCollectGem,
    onOpenZone,
    onHunt,
    onSceneReady,
  } = props

  return (
    <>
      <color attach="background" args={['#bfe3ff']} />
      <fog attach="fog" args={['#cfe6ff', 100, 300]} />

      <hemisphereLight args={['#bfe3ff', '#5c8a2e', 0.85]} />
      <ambientLight intensity={0.5} color="#fff4e0" />
      <SunLight playerRef={playerRef} quality={quality} />
      <directionalLight position={[-60, 30, -60]} intensity={0.3} color="#cfe8ff" />

      <Sky
        distance={450000}
        sunPosition={[70, 92, 40]}
        turbidity={5.5}
        rayleigh={1.2}
        mieCoefficient={0.006}
        mieDirectionalG={0.85}
      />

      <FollowCamera playerRef={playerRef} zoomInZone={Boolean(modalZone)} cameraYawRef={cameraYawRef} />

      <Suspense fallback={null}>
        <WorldEnvironment collectedIds={collectedGems} grassCount={quality === 'low' ? 1600 : 4000} />
        <Wildlife quality={quality} playerRef={playerRef} onHunt={onHunt} />
        <NpcVillagers playerRef={playerRef} quality={quality} />

        {ZONES.map((zone) => (
          <ZonePlatform
            key={zone.id}
            zone={zone}
            isInside={activeZone?.id === zone.id}
            onTrigger={onOpenZone}
          />
        ))}

        <Character
          preset={character}
          keys={keys}
          cameraYawRef={cameraYawRef}
          playerRef={playerRef}
          virtualInputRef={virtualInputRef}
          virtualJumpRef={virtualJumpRef}
          virtualSprintRef={virtualSprintRef}
          attackRef={attackRef}
          collectedRef={collectedRef}
          onZoneChange={onZoneChange}
          onCollectGem={onCollectGem}
        />

        <SceneReadyProbe onReady={onSceneReady} />
      </Suspense>
    </>
  )
})

export default function App() {
  const keys = useKeyboard()

  // Authoritative per-frame player state (ref, no re-render)
  const playerRef = useRef<PlayerState>({
    position: new THREE.Vector3(0, 0, 0),
    rotation: 0,
    sprinting: false,
    airborne: false,
  })
  const cameraYawRef = useRef(0)
  const collectedRef = useRef<Set<number>>(new Set())

  // Virtual (mobile) input held in refs so the canvas never re-renders on touch
  const virtualInputRef = useRef({ x: 0, y: 0 })
  const virtualJumpRef = useRef(false)
  const virtualSprintRef = useRef(false)
  const attackRef = useRef(false)

  // Coarse HUD snapshot (throttled) — only the 2D overlay consumes this
  const [hud, setHud] = useState({ pos: new THREE.Vector3(0, 0, 0), rot: 0 })

  const [activeZone, setActiveZone] = useState<ZoneData | null>(null)
  const [modalZone, setModalZone] = useState<ZoneData | null>(null)
  const [collectedGems, setCollectedGems] = useState<number[]>([])
  const [hunts, setHunts] = useState(0)
  const [quality, setQuality] = useState<Quality>('high')

  // First-load gate: keep the world hidden behind the loader until the 3D scene
  // has really painted its first frames.
  const [sceneReady, setSceneReady] = useState(false)
  const [showLoader, setShowLoader] = useState(true)

  // Playable hero — persisted so the pick survives a reload.
  const [characterId, setCharacterId] = useState<string>(() => {
    try {
      return localStorage.getItem('mr-character') ?? DEFAULT_CHARACTER_ID
    } catch {
      return DEFAULT_CHARACTER_ID
    }
  })
  const character = useMemo(() => getCharacter(characterId), [characterId])

  const handleCharacterChange = useCallback((id: string) => {
    setCharacterId(id)
    try {
      localStorage.setItem('mr-character', id)
    } catch {
      /* storage unavailable — selection just won't persist */
    }
  }, [])

  const [quests, setQuests] = useState<QuestState>({
    visitedAbout: false,
    visitedProjects: false,
    visitedSkills: false,
    visitedContact: false,
    allGemsCollected: false,
  })

  const totalGems = GEMS.length

  // Throttled HUD sync (~10 Hz)
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current.position
      setHud({ pos: p.clone(), rot: playerRef.current.rotation })
    }, 100)
    return () => clearInterval(id)
  }, [])

  const onZoneChange = useCallback((zone: ZoneData | null) => {
    setActiveZone((prev) => (prev?.id === zone?.id ? prev : zone))
    if (!zone) return
    setQuests((q) => {
      if (zone.id === 'about' && !q.visitedAbout) return { ...q, visitedAbout: true }
      if (zone.id === 'projects' && !q.visitedProjects) return { ...q, visitedProjects: true }
      if (zone.id === 'skills' && !q.visitedSkills) return { ...q, visitedSkills: true }
      if (zone.id === 'contact' && !q.visitedContact) return { ...q, visitedContact: true }
      return q
    })
  }, [])

  const onCollectGem = useCallback((id: number) => {
    if (collectedRef.current.has(id)) return
    collectedRef.current.add(id)
    setCollectedGems((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const onHunt = useCallback(() => setHunts((h) => h + 1), [])

  const onSceneReady = useCallback(() => setSceneReady(true), [])

  // Attack is edge-triggered via a ref (consumed by the Character each swing)
  const triggerAttack = useCallback(() => {
    attackRef.current = true
  }, [])

  // Completion celebration
  useEffect(() => {
    if (totalGems > 0 && collectedGems.length === totalGems) {
      setQuests((q) => (q.allGemsCollected ? q : { ...q, allGemsCollected: true }))
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } })
    }
  }, [collectedGems.length, totalGems])

  // Interact / close handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && activeZone && !modalZone) setModalZone(activeZone)
      if (e.code === 'KeyF' && !modalZone) attackRef.current = true
      if (e.code === 'Escape' && modalZone) setModalZone(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeZone, modalZone])

  const handleTeleport = useCallback((zone: ZoneData) => {
    const x = zone.position[0]
    const z = zone.position[2] + 3.5
    playerRef.current.position.set(x, getTerrainHeight(x, z), z)
    setActiveZone(zone)
  }, [])

  const handleVirtualMove = useCallback((dir: { x: number; y: number }) => {
    virtualInputRef.current.x = dir.x
    virtualInputRef.current.y = dir.y
  }, [])

  const handleVirtualSprint = useCallback((sprinting: boolean) => {
    virtualSprintRef.current = sprinting
  }, [])

  const triggerMobileJump = useCallback(() => {
    virtualJumpRef.current = true
    window.setTimeout(() => {
      virtualJumpRef.current = false
    }, 120)
  }, [])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-sky-200 select-none">
      <Canvas
        shadows={quality === 'high'}
        dpr={quality === 'low' ? [0.75, 1] : [1, 1.6]}
        style={{ touchAction: 'none' }}
        camera={{ position: [0, 18, 24], fov: 48, near: 0.1, far: 400 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      >
        <Scene
          character={character}
          keys={keys}
          playerRef={playerRef}
          cameraYawRef={cameraYawRef}
          collectedRef={collectedRef}
          collectedGems={collectedGems}
          activeZone={activeZone}
          modalZone={modalZone}
          quality={quality}
          virtualInputRef={virtualInputRef}
          virtualJumpRef={virtualJumpRef}
          virtualSprintRef={virtualSprintRef}
          attackRef={attackRef}
          onZoneChange={onZoneChange}
          onCollectGem={onCollectGem}
          onOpenZone={setModalZone}
          onHunt={onHunt}
          onSceneReady={onSceneReady}
        />
      </Canvas>

      <GameUI
        activeZone={activeZone}
        playerPos={hud.pos}
        playerRotation={hud.rot}
        gemCount={collectedGems.length}
        totalGems={totalGems}
        collectedIds={collectedGems}
        hunts={hunts}
        quests={quests}
        quality={quality}
        onQualityChange={setQuality}
        character={character}
        onCharacterChange={handleCharacterChange}
        onOpenZone={(zone) => setModalZone(zone)}
        onTeleport={handleTeleport}
        onVirtualMove={handleVirtualMove}
        onVirtualJump={triggerMobileJump}
        onVirtualSprint={handleVirtualSprint}
        onAttack={triggerAttack}
      />

      <PortfolioModal zone={modalZone} onClose={() => setModalZone(null)} />

      {showLoader && <LoadingScreen sceneReady={sceneReady} onDone={() => setShowLoader(false)} />}
    </main>
  )
}
