// Real 3D character assets — the source of every hero and villager model.
//
// Source: KayKit "Character Pack: Adventurers" by Kay Lousberg (CC0, no
// attribution required — see public/models/CREDITS.md). The upstream GLBs ship
// 76 animation clips each (~3.6 MB per file); scripts/optimize-models.mjs trims
// them to the clips the game actually plays and meshopt-compresses the rest
// down to ~480 KB per character.

export type ModelKey = 'knight' | 'mage' | 'rogue' | 'rogueHooded' | 'barbarian'

export interface ModelDef {
  /** Public URL of the optimised GLB. */
  url: string
  /** Bind-pose height of the source asset in its own units (feet sit at y = 0). */
  height: number
}

/** Every playable / wandering character, keyed for presets and NPC defs. */
export const MODELS: Record<ModelKey, ModelDef> = {
  knight: { url: '/models/knight.glb', height: 2.315 },
  mage: { url: '/models/mage.glb', height: 2.203 },
  rogue: { url: '/models/rogue.glb', height: 2.187 },
  rogueHooded: { url: '/models/rogue_hooded.glb', height: 2.251 },
  barbarian: { url: '/models/barbarian.glb', height: 2.186 },
}

/** World height every character is normalised to (matches the old blocky rig). */
export const CHARACTER_HEIGHT = 1.85

/** Scale factor that normalises `key` to {@link CHARACTER_HEIGHT}. */
export function modelScale(key: ModelKey): number {
  return CHARACTER_HEIGHT / MODELS[key].height
}

/**
 * Clip names the game plays. All five characters share the KayKit humanoid rig,
 * so the same names resolve on every one of them.
 */
export const CLIP = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  jumpStart: 'Jump_Start',
  jumpIdle: 'Jump_Idle',
  jumpLand: 'Jump_Land',
  attack: '1H_Melee_Attack_Chop',
  cheer: 'Cheer',
} as const
