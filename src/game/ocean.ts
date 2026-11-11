// Single source of truth for the sea surface.
//
// The ocean is a sum of three Gerstner swells, evaluated on the GPU in
// `Ocean.tsx`. Anything that floats (the ferry, the hero standing on its deck)
// needs the *same* height on the CPU, otherwise it hovers above or sinks
// through the animated water. Both sides read the swells from here.

/**
 * Sea level. The islands' cliffs drop to roughly y = -44 at the rim and their
 * underside cones reach y = -50, so a surface at -30 leaves each island rising
 * out of the water while its rock root stays mostly submerged.
 */
export const OCEAN_Y = -30

/**
 * Big enough that the far edge is always beyond the scene fog (near 100,
 * far 300), so the horizon dissolves into the sky instead of showing a seam.
 */
export const OCEAN_SIZE = 1600

/** One Gerstner swell: travel direction (XZ), steepness and wavelength. */
export interface Swell {
  dir: [number, number]
  steepness: number
  wavelength: number
}

/** The three swells that make up the surface — order matches the shader. */
export const SWELLS: Swell[] = [
  { dir: [1.0, 0.32], steepness: 0.26, wavelength: 90.0 },
  { dir: [-0.55, 1.0], steepness: 0.2, wavelength: 48.0 },
  { dir: [0.42, -0.9], steepness: 0.16, wavelength: 28.0 },
]

/** Per-swell constants, resolved once so the per-frame CPU sample stays cheap. */
const DERIVED = SWELLS.map((s) => {
  const k = (Math.PI * 2) / s.wavelength
  const c = Math.sqrt(9.8 / k)
  const len = Math.hypot(s.dir[0], s.dir[1]) || 1
  return { dx: s.dir[0] / len, dz: s.dir[1] / len, k, c, amp: s.steepness / k }
})

/**
 * Absolute height of the sea surface at a world XZ and time — the CPU twin of
 * the vertex shader. Sample it to keep floating objects riding the real waves.
 */
export function waveHeight(x: number, z: number, t: number): number {
  let y = 0
  for (const s of DERIVED) {
    y += s.amp * Math.sin(s.k * (s.dx * x + s.dz * z - s.c * t))
  }
  return OCEAN_Y + y
}
