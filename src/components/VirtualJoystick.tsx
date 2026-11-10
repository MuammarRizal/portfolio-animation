import React, { useRef, useState } from 'react'

interface VirtualJoystickProps {
  onMove: (dir: { x: number; y: number }) => void
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [touchPos, setTouchPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const activeTouchId = useRef<number | null>(null)

  const radius = 45 // max displacement in px

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTouchId.current !== null) return
    const touch = e.changedTouches[0]
    activeTouchId.current = touch.identifier
    setActive(true)
    updateThumb(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeTouchId.current) {
        updateThumb(touch.clientX, touch.clientY)
        break
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeTouchId.current) {
        activeTouchId.current = null
        setActive(false)
        setTouchPos({ x: 0, y: 0 })
        onMove({ x: 0, y: 0 })
        break
      }
    }
  }

  const updateThumb = (clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = clientX - centerX
    const dy = clientY - centerY
    const dist = Math.hypot(dx, dy)

    if (dist <= radius) {
      setTouchPos({ x: dx, y: dy })
      onMove({ x: dx / radius, y: dy / radius })
    } else {
      const angle = Math.atan2(dy, dx)
      const clampedX = Math.cos(angle) * radius
      const clampedY = Math.sin(angle) * radius
      setTouchPos({ x: clampedX, y: clampedY })
      onMove({ x: clampedX / radius, y: clampedY / radius })
    }
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative w-28 h-28 rounded-full border-2 transition-colors select-none flex items-center justify-center backdrop-blur-md shadow-xl touch-none ${
        active
          ? 'bg-blue-100/80 border-blue-400/80'
          : 'bg-white/70 border-white/80'
      }`}
    >
      {/* Center crosshairs */}
      <div className="absolute w-8 h-[1px] bg-slate-300" />
      <div className="absolute h-8 w-[1px] bg-slate-300" />

      {/* Floating Analog Stick Knob */}
      <div
        className={`w-14 h-14 rounded-full border flex items-center justify-center transition-transform duration-75 shadow-lg ${
          active
            ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 border-blue-300 shadow-blue-500/50 scale-105'
            : 'bg-white border-slate-300'
        }`}
        style={{
          transform: `translate(${touchPos.x}px, ${touchPos.y}px)`,
        }}
      >
        <div className="w-4 h-4 rounded-full bg-white/40" />
      </div>
    </div>
  )
}
