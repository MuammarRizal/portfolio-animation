import React, { useEffect, useMemo } from 'react'
import * as THREE from 'three'

interface WorldLabelProps {
  title: string
  subtitle?: string
  /** Colour used for the subtitle line. */
  color?: string
  width?: number
  height?: number
}

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
const CANVAS_W = 640
const CANVAS_H = 240
const MAX_TEXT_W = CANVAS_W * 0.92

/** Largest font size (2px steps) that still fits `maxWidth`. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  startSize: number,
  maxWidth: number
): number {
  let size = startSize
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 2
  }
  return size
}

/** Paint the two lines onto the canvas. */
function paint(canvas: HTMLCanvasElement, title: string, subtitle: string | undefined, color: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'

  const titleY = subtitle ? CANVAS_H * 0.36 : CANVAS_H * 0.5
  const titleSize = fitFont(ctx, title, 800, 92, MAX_TEXT_W)
  ctx.font = `800 ${titleSize}px ${FONT_STACK}`
  ctx.lineWidth = 14
  ctx.strokeStyle = 'rgba(9,13,22,0.92)'
  ctx.strokeText(title, CANVAS_W / 2, titleY)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(title, CANVAS_W / 2, titleY)

  if (subtitle) {
    const subY = CANVAS_H * 0.74
    const subSize = fitFont(ctx, subtitle, 600, 44, MAX_TEXT_W)
    ctx.font = `600 ${subSize}px ${FONT_STACK}`
    ctx.lineWidth = 10
    ctx.strokeStyle = 'rgba(9,13,22,0.88)'
    ctx.strokeText(subtitle, CANVAS_W / 2, subY)
    ctx.fillStyle = color
    ctx.fillText(subtitle, CANVAS_W / 2, subY)
  }
}

/**
 * Floating world-space text drawn to a CanvasTexture.
 *
 * Deliberately avoids drei's <Text>, which pulls a font index from
 * cdn.jsdelivr.net at runtime (troika's defaultFontURL is null). That made the
 * whole page depend on a CDN: offline the font request never resolved, so the
 * <Suspense> boundary never committed and the boot loader hung until its hard
 * timeout. Canvas text only uses locally installed fonts.
 */
export const WorldLabel: React.FC<WorldLabelProps> = ({
  title,
  subtitle,
  color = '#ffffff',
  width = 6.4,
  height = 2.4,
}) => {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = CANVAS_W
    c.height = CANVAS_H
    return c
  }, [])

  // Texture is derived from the props — a subtitle change (zone entered) simply
  // produces a fresh texture, and the old one is disposed below.
  const texture = useMemo(() => {
    paint(canvas, title, subtitle, color)
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [canvas, title, subtitle, color])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh renderOrder={10}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}
