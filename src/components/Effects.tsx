import React from 'react'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

interface EffectsProps {
  quality: 'high' | 'low'
}

/**
 * Post-processing chain.
 *
 * Only mounted on the 'high' tier — the 'low' tier renders straight to the
 * canvas so low-end phones stay smooth.
 *
 * Two deliberate choices:
 *  - No ToneMapping effect: the Canvas already runs R3F's default ACES filmic
 *    tone mapping inside the material shaders, so adding one here would apply
 *    it twice.
 *  - multisampling instead of SMAA: MSAA resolves thin geometry (grass blades,
 *    archway edges) far better than a post-process edge filter, and three r187
 *    is WebGL2-only so multisampled render targets are always available.
 *
 * Bloom tuning note: R3F already applies ACES filmic tone mapping inside the
 * material shaders, so by the time bloom sees a pixel it is already compressed
 * into 0..1. The threshold is therefore deliberately high (0.82) so only the
 * genuinely bright emissives (gems, runes, lantern orbs, beacon columns) glow —
 * a lower threshold would bloom the bright sky and milk out the whole image.
 * If the glow reads as too subtle, lower `luminanceThreshold` and raise
 * `intensity` together.
 */
export const Effects: React.FC<EffectsProps> = ({ quality }) => {
  if (quality === 'low') return null

  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom
        intensity={0.55}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.3}
        mipmapBlur
        radius={0.7}
      />
      <Vignette eskil={false} offset={0.45} darkness={0.4} />
    </EffectComposer>
  )
}
