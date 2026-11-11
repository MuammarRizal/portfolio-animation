import { useState, useEffect, useRef, useCallback, useMemo, memo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sky, PerformanceMonitor, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import confetti from 'canvas-confetti'

import { useKeyboard, type KeyState } from './hooks/useKeyboard'
import { Character } from './components/Character'
import { FollowCamera } from './components/FollowCamera'
import { ZonePlatform } from './components/ZonePlatform'
import { WorldEnvironment } from './components/WorldEnvironment'
import { Wildlife } from './components/Wildlife'
import { Boat, type BoatState, type DockPrompt } from './components/Boat'
import { NpcVillagers } from './components/NpcVillagers'
import { GameUI } from './components/GameUI'
import { PortfolioModal } from './components/PortfolioModal'
import { HousePanel } from './components/HousePanel'
import { DialoguePanel } from './components/DialoguePanel'
import { LoadingScreen } from './components/LoadingScreen'
import { Effects } from './components/Effects'
import { Ocean } from './components/Ocean'
import { ZONES, HOUSES, GEMS, type HouseData, type ZoneData } from './data/portfolio'
import { DEFAULT_CHARACTER_ID, getCharacter, type CharacterPreset } from './game/characters'
import type { VillagerDef } from './game/npcs'
import { VILLAGERS } from './game/npcs'
import { MODELS, type ModelKey } from './game/models'
import { sfx } from './game/audio'
import type { QuestState } from './components/QuestTracker'
import { DOCKS, getTerrainHeight, getWorld, type Dock, type PlayerState, type World } from './game/world'
import { MAP_DEFS } from './game/maps'

type Quality = 'high' | 'low'

/** Distance from an island's centre at which its expensive content (grass,
 * wildlife) is streamed in. Terrain, houses and decorations always stay. */
const DETAIL_RANGE = 150

/**
 * One island of the archipelago: terrain + structures (always drawn) plus the
 * per-pixel-heavy ground cover and wildlife, which only mount while the hero is
 * near enough to notice them.
 */
const Island: React.FC<{
  world: World
  playerRef: React.MutableRefObject<PlayerState>
  collectedGems: number[]
  quality: Quality
  onHunt: () => void
}> = ({ world, playerRef, collectedGems, quality, onHunt }) => {
  const [ox, oz] = world.def.origin
  const [near, setNear] = useState(() => {
    const p = playerRef.current.position
    return Math.hypot(p.x - ox, p.z - oz) < DETAIL_RANGE
  })

  useFrame(() => {
    const p = playerRef.current.position
    const shouldBeNear = Math.hypot(p.x - ox, p.z - oz) < DETAIL_RANGE
    if (shouldBeNear !== near) setNear(shouldBeNear)
  })

  return (
    <>
      <WorldEnvironment
        world={world}
        collectedIds={collectedGems}
        detail={near}
        grassCount={quality === 'low' ? 1600 : 4000}
        flowerCount={quality === 'low' ? 300 : 850}
      />
      {near && <Wildlife world={world} quality={quality} playerRef={playerRef} onHunt={onHunt} />}
    </>
  )
}

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
  modalHouse: HouseData | null
  modalNpc: VillagerDef | null
  quality: Quality
  virtualInputRef: React.MutableRefObject<{ x: number; y: number }>
  virtualJumpRef: React.MutableRefObject<boolean>
  virtualSprintRef: React.MutableRefObject<boolean>
  attackRef: React.MutableRefObject<boolean>
  driving: boolean
  boatRef: React.MutableRefObject<BoatState>
  boatActionRef: React.MutableRefObject<() => void>
  onDockPromptChange: (prompt: DockPrompt | null) => void
  onBoardBoat: (dock: Dock) => void
  onLeaveBoat: (dock: Dock) => void
  onZoneChange: (zone: ZoneData | null) => void
  onHouseChange: (house: HouseData | null) => void
  onTalkChange: (npc: VillagerDef | null) => void
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
    modalHouse,
    modalNpc,
    quality,
    virtualInputRef,
    virtualJumpRef,
    virtualSprintRef,
    attackRef,
    driving,
    boatRef,
    boatActionRef,
    onDockPromptChange,
    onBoardBoat,
    onLeaveBoat,
    onZoneChange,
    onHouseChange,
    onTalkChange,
    onCollectGem,
    onOpenZone,
    onHunt,
    onSceneReady,
  } = props

  // Pull every character GLB into the loader cache up front. The hero and the
  // villagers share the same five models, so this both warms the NPCs and makes
  // swapping the playable hero instant (no suspense blank-out on switch).
  useEffect(() => {
    for (const key of Object.keys(MODELS) as ModelKey[]) {
      useGLTF.preload(MODELS[key].url, false, true)
    }
  }, [])

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

      <Ocean quality={quality} />

      <FollowCamera
        playerRef={playerRef}
        zoomInZone={Boolean(modalZone || modalHouse || modalNpc)}
        cameraYawRef={cameraYawRef}
        seaMode={driving}
      />

      <Suspense fallback={null}>
        {MAP_DEFS.map((def) => (
          <Island
            key={def.id}
            world={getWorld(def.id)}
            playerRef={playerRef}
            collectedGems={collectedGems}
            quality={quality}
            onHunt={onHunt}
          />
        ))}

        <Suspense fallback={null}>
          <NpcVillagers playerRef={playerRef} quality={quality} onTalkChange={onTalkChange} />
        </Suspense>

        {ZONES.map((zone) => (
          <ZonePlatform
            key={zone.id}
            zone={zone}
            isInside={activeZone?.id === zone.id}
            onTrigger={onOpenZone}
          />
        ))}

        <Boat
          driving={driving}
          boatRef={boatRef}
          playerRef={playerRef}
          keys={keys}
          virtualInputRef={virtualInputRef}
          actionRef={boatActionRef}
          onPromptChange={onDockPromptChange}
          onBoard={onBoardBoat}
          onDisembark={onLeaveBoat}
        />

        {!driving && (
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
            quality={quality}
            onZoneChange={onZoneChange}
            onHouseChange={onHouseChange}
            onCollectGem={onCollectGem}
          />
        )}

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

  // Boat handling: the archipelago's dinghy, plus what the player can do now.
  const boatActionRef = useRef<() => void>(() => {})
  const boatRef = useRef<BoatState>({
    x: DOCKS[0].boatX,
    z: DOCKS[0].boatZ,
    yaw: DOCKS[0].boatRot,
    speed: 0,
  })
  const [driving, setDriving] = useState(false)
  const [dockPrompt, setDockPrompt] = useState<DockPrompt | null>(null)

  // Coarse HUD snapshot (throttled) — only the 2D overlay consumes this
  const [hud, setHud] = useState({ pos: new THREE.Vector3(0, 0, 0), rot: 0 })

  const [activeZone, setActiveZone] = useState<ZoneData | null>(null)
  const [modalZone, setModalZone] = useState<ZoneData | null>(null)
  const [activeHouse, setActiveHouse] = useState<HouseData | null>(null)
  const [modalHouse, setModalHouse] = useState<HouseData | null>(null)
  const [visitedHouses, setVisitedHouses] = useState<string[]>([])
  const [activeNpc, setActiveNpc] = useState<VillagerDef | null>(null)
  const [modalNpc, setModalNpc] = useState<VillagerDef | null>(null)
  const [talkedNpcs, setTalkedNpcs] = useState<string[]>([])
  const [collectedGems, setCollectedGems] = useState<number[]>([])
  const [hunts, setHunts] = useState(0)
  const [quality, setQuality] = useState<Quality>('high')

  // Adaptive resolution cap: PerformanceMonitor walks this down when frames get
  // expensive and back up when they are cheap again. Floored at 0.9 so a
  // struggling device never turns into a blurry mess.
  const [dprCap, setDprCap] = useState(1.6)

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

  // Switching tier also resets the adaptive resolution cap.
  const handleQualityChange = useCallback((next: Quality) => {
    setQuality(next)
    setDprCap(next === 'low' ? 1 : 1.6)
  }, [])

  const [quests, setQuests] = useState<QuestState>({
    visitedZones: [],
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
    sfx.zone()
    setQuests((q) => (q.visitedZones.includes(zone.id) ? q : { ...q, visitedZones: [...q.visitedZones, zone.id] }))
  }, [])

  const onCollectGem = useCallback((id: number) => {
    if (collectedRef.current.has(id)) return
    collectedRef.current.add(id)
    setCollectedGems((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])
  const onHunt = useCallback(() => setHunts((h) => h + 1), [])

  // Nearest-house tracking (fires only when the active house changes).
  const onHouseChange = useCallback((house: HouseData | null) => {
    setActiveHouse((prev) => (prev?.id === house?.id ? prev : house))
  }, [])

  // Knock at a house: open its mini-zone panel and record the visit.
  const openHouse = useCallback((house: HouseData) => {
    setModalHouse(house)
    setVisitedHouses((prev) => (prev.includes(house.id) ? prev : [...prev, house.id]))
    sfx.uiOpen()
  }, [])

  // Nearest-villager tracking (fires only when the active villager changes).
  const onTalkChange = useCallback((npc: VillagerDef | null) => {
    setActiveNpc((prev) => (prev?.id === npc?.id ? prev : npc))
  }, [])

  // Start a conversation: open the dialogue panel and record the chat.
  const openNpc = useCallback((npc: VillagerDef) => {
    setModalNpc(npc)
    setTalkedNpcs((prev) => (prev.includes(npc.id) ? prev : [...prev, npc.id]))
    sfx.uiOpen()
  }, [])

  const onSceneReady = useCallback(() => setSceneReady(true), [])

  // Take the helm: the hero steps off the beach and the camera swings to the boat.
  const handleBoardBoat = useCallback((dock: Dock) => {
    boatRef.current.x = dock.boatX
    boatRef.current.z = dock.boatZ
    boatRef.current.yaw = dock.boatRot
    boatRef.current.speed = 0
    setDriving(true)
    setDockPrompt(null)
    setActiveZone(null)
    setActiveHouse(null)
    setActiveNpc(null)
    sfx.confirm()
  }, [])

  // Hop back onto the beach at the pier the boat is tied to.
  const handleLeaveBoat = useCallback((dock: Dock) => {
    playerRef.current.position.set(dock.x, getTerrainHeight(dock.x, dock.z), dock.z)
    playerRef.current.rotation = dock.rot + Math.PI
    setDriving(false)
    setDockPrompt(null)
    sfx.uiClose()
  }, [])

  // Attack is edge-triggered via a ref (consumed by the Character each swing)
  const triggerAttack = useCallback(() => {
    attackRef.current = true
  }, [])

  // Completion celebration
  useEffect(() => {
    if (totalGems > 0 && collectedGems.length === totalGems) {
      setQuests((q) => (q.allGemsCollected ? q : { ...q, allGemsCollected: true }))
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } })
      sfx.zone()
    }
  }, [collectedGems.length, totalGems])

  // Interact / close handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const anyModal = Boolean(modalZone || modalHouse || modalNpc)
      if (e.code === 'KeyE' && !anyModal) {
        // Priority: a boat at the pier beats a villager, which beats a zone, then a house.
        if (dockPrompt) boatActionRef.current()
        else if (activeNpc) openNpc(activeNpc)
        else if (activeZone) setModalZone(activeZone)
        else if (activeHouse) openHouse(activeHouse)
      }
      if (e.code === 'KeyF' && !anyModal) attackRef.current = true
      if (e.code === 'Escape') {
        setModalZone(null)
        setModalHouse(null)
        setModalNpc(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeZone, activeHouse, activeNpc, modalZone, modalHouse, modalNpc, openHouse, openNpc, dockPrompt])

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
        dpr={[0.75, dprCap]}
        style={{ touchAction: 'none' }}
        camera={{ position: [0, 18, 24], fov: 48, near: 0.1, far: 400 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDprCap((c) => Math.max(0.9, Math.round((c - 0.2) * 100) / 100))}
          onIncline={() => setDprCap((c) => Math.min(1.6, Math.round((c + 0.1) * 100) / 100))}
        />
        <Scene
          character={character}
          keys={keys}
          playerRef={playerRef}
          cameraYawRef={cameraYawRef}
          collectedRef={collectedRef}
          collectedGems={collectedGems}
          activeZone={activeZone}
          modalZone={modalZone}
          modalHouse={modalHouse}
          modalNpc={modalNpc}
          quality={quality}
          virtualInputRef={virtualInputRef}
          virtualJumpRef={virtualJumpRef}
          virtualSprintRef={virtualSprintRef}
          attackRef={attackRef}
          driving={driving}
          boatRef={boatRef}
          boatActionRef={boatActionRef}
          onDockPromptChange={setDockPrompt}
          onBoardBoat={handleBoardBoat}
          onLeaveBoat={handleLeaveBoat}
          onZoneChange={onZoneChange}
          onHouseChange={onHouseChange}
          onTalkChange={onTalkChange}
          onCollectGem={onCollectGem}
          onOpenZone={setModalZone}
          onHunt={onHunt}
          onSceneReady={onSceneReady}
        />
        <Effects quality={quality} />
      </Canvas>

      <GameUI
        activeZone={activeZone}
        activeHouse={activeHouse}
        activeNpc={activeNpc}
        boatPrompt={dockPrompt}
        playerPos={hud.pos}
        playerRotation={hud.rot}
        gemCount={collectedGems.length}
        totalGems={totalGems}
        collectedIds={collectedGems}
        hunts={hunts}
        quests={quests}
        housesVisited={visitedHouses.length}
        totalHouses={HOUSES.length}
        npcsTalked={talkedNpcs.length}
        totalNpcs={VILLAGERS.length}
        quality={quality}
        onQualityChange={handleQualityChange}
        character={character}
        onCharacterChange={handleCharacterChange}
        onOpenZone={(zone) => setModalZone(zone)}
        onOpenHouse={openHouse}
        onOpenNpc={openNpc}
        onBoatAction={() => boatActionRef.current()}
        onTeleport={handleTeleport}
        onVirtualMove={handleVirtualMove}
        onVirtualJump={triggerMobileJump}
        onVirtualSprint={handleVirtualSprint}
        onAttack={triggerAttack}
      />

      <PortfolioModal zone={modalZone} onClose={() => setModalZone(null)} />

      <HousePanel house={modalHouse} onClose={() => setModalHouse(null)} />

      <DialoguePanel npc={modalNpc} onClose={() => setModalNpc(null)} />

      {showLoader && <LoadingScreen sceneReady={sceneReady} onDone={() => setShowLoader(false)} />}
    </main>
  )
}
