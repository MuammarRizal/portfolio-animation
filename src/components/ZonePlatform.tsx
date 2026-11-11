import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ZoneData } from '../data/portfolio'
import { WorldLabel } from './WorldLabel'

interface ZonePlatformProps {
  zone: ZoneData
  isInside: boolean
  onTrigger: (zone: ZoneData) => void
}

export const ZonePlatform: React.FC<ZonePlatformProps> = ({ zone, isInside, onTrigger }) => {
  const haloRef = useRef<THREE.Mesh>(null)
  const iconRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    // Rotating holographic ring
    if (haloRef.current) {
      haloRef.current.rotation.z += delta * (isInside ? 1.5 : 0.6)
    }
    // Floating pedestal icon
    if (iconRef.current) {
      iconRef.current.position.y = 1.6 + Math.sin(state.clock.elapsedTime * 2.5) * 0.15
      iconRef.current.rotation.y += delta * 0.8
    }
  })

  // Determine geometry by zone kind (zones on different islands share a kind)
  const renderIcon = () => {
    switch (zone.kind) {
      case 'about':
        // Holographic ID badge / User Diamond
        return (
          <group ref={iconRef}>
            <mesh castShadow>
              <octahedronGeometry args={[0.7, 0]} />
              <meshStandardMaterial
                color="#60a5fa"
                emissive="#3b82f6"
                emissiveIntensity={isInside ? 1.2 : 0.5}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>
          </group>
        )
      case 'projects':
        // Mini Arcade Machine / Retro Display
        return (
          <group ref={iconRef}>
            <mesh castShadow>
              <boxGeometry args={[0.9, 1.1, 0.7]} />
              <meshStandardMaterial color="#8b5cf6" roughness={0.3} metalness={0.4} />
            </mesh>
            {/* Screen */}
            <mesh position={[0, 0.15, 0.36]}>
              <planeGeometry args={[0.65, 0.45]} />
              <meshStandardMaterial
                color="#c084fc"
                emissive="#a855f7"
                emissiveIntensity={isInside ? 1.5 : 0.8}
              />
            </mesh>
          </group>
        )
      case 'skills':
        // Tech Crystal cluster / Gear
        return (
          <group ref={iconRef}>
            <mesh castShadow>
              <dodecahedronGeometry args={[0.7, 0]} />
              <meshStandardMaterial
                color="#34d399"
                emissive="#10b981"
                emissiveIntensity={isInside ? 1.2 : 0.4}
                roughness={0.2}
                wireframe={!isInside}
              />
            </mesh>
          </group>
        )
      case 'contact':
        // Futuristic Beacon / Mailbox
        return (
          <group ref={iconRef}>
            <mesh castShadow>
              <cylinderGeometry args={[0.4, 0.4, 0.9, 16]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#f59e0b"
                emissiveIntensity={isInside ? 1.2 : 0.4}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0.7, 0]}>
              <sphereGeometry args={[0.25, 16, 16]} />
              <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={1} />
            </mesh>
          </group>
        )
    }
  }

  return (
    <group position={zone.position} onClick={() => onTrigger(zone)}>
      {/* Base platform */}
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[zone.radius * 0.95, zone.radius, 0.16, 32]} />
        <meshStandardMaterial
          color={isInside ? '#e5e9ef' : '#cfd6df'}
          roughness={0.7}
          metalness={0}
        />
      </mesh>

      {/* Holographic Glowing Circle Ring */}
      <mesh ref={haloRef} position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zone.radius * 0.8, zone.radius * 0.9, 32]} />
        <meshBasicMaterial
          color={zone.color}
          transparent
          opacity={isInside ? 0.85 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Light Pillar / Beam on active */}
      {isInside && (
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[zone.radius * 0.7, zone.radius * 0.8, 6, 24, 1, true]} />
          <meshBasicMaterial
            color={zone.color}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Center Pedestal */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.9, 0.8, 16]} />
        <meshStandardMaterial color="#b9c2cd" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Animated 3D Floating Icon */}
      {renderIcon()}

      {/* Grand Landmark Monument (visible from afar) */}
      <group position={[0, 0, -zone.radius * 0.55]}>
        {/* Twin guardian pillars */}
        <mesh position={[-zone.radius * 0.5, 5, 0]} castShadow>
          <boxGeometry args={[1.1, 10, 1.1]} />
          <meshStandardMaterial color="#aab4c0" roughness={0.85} flatShading />
        </mesh>
        <mesh position={[zone.radius * 0.5, 5, 0]} castShadow>
          <boxGeometry args={[1.1, 10, 1.1]} />
          <meshStandardMaterial color="#aab4c0" roughness={0.85} flatShading />
        </mesh>
        {/* Grand lintel */}
        <mesh position={[0, 10.4, 0]} castShadow>
          <boxGeometry args={[zone.radius * 1.4, 1.2, 1.4]} />
          <meshStandardMaterial color="#c3ccd7" roughness={0.8} flatShading />
        </mesh>
        {/* Glowing rune bar */}
        <mesh position={[0, 10.4, 0.75]}>
          <planeGeometry args={[zone.radius * 0.9, 0.4]} />
          <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* Sky Beacon — tall light column always visible from far away */}
      <mesh position={[0, 22, 0]}>
        <cylinderGeometry args={[zone.radius * 0.18, zone.radius * 0.34, 40, 20, 1, true]} />
        <meshBasicMaterial
          color={zone.color}
          transparent
          opacity={isInside ? 0.18 : 0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3D Title Floating in World (canvas texture — no external font fetch) */}
      <group position={[0, 3.9, 0]}>
        <WorldLabel
          title={zone.title}
          subtitle={isInside ? '▼ Tekan [E] atau Klik untuk Buka' : zone.subtitle}
          color={zone.color}
        />
      </group>
    </group>
  )
}
