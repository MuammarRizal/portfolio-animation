// Build-time asset optimiser for the KayKit character models.
//
// The upstream GLBs ship 76 animation clips each (~3.6 MB every file). We only
// ever play a handful, so this strips the rest, downsamples the gradient atlas
// to 256px WebP and applies meshopt compression + quantisation.
//
// Source (CC0): KayKit Character Pack - Adventurers by Kay Lousberg
//   https://kaylousberg.itch.io/kaykit-adventurers
//   https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
//
// Usage:
//   node scripts/optimize-models.mjs <src-dir> <out-dir>
//
// <src-dir> must contain Knight.glb, Mage.glb, Rogue.glb, Rogue_Hooded.glb and
// Barbarian.glb exactly as downloaded from the repo above.

import { mkdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, quantize, meshopt, textureCompress } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

/**
 * Clips the game actually plays. Everything else is dead weight, and the source
 * files carry 76 clips apiece.
 */
const KEEP_ANIMATIONS = new Set([
  'Idle',
  'Walking_A',
  'Walking_B',
  'Running_A',
  'Running_B',
  'Jump_Start',
  'Jump_Idle',
  'Jump_Land',
  'Dodge_Forward',
  '1H_Melee_Attack_Chop',
  '1H_Melee_Attack_Slice_Diagonal',
  'Cheer',
  'Interact',
  'PickUp',
  'Hit_A',
  'Death_A',
])

const SOURCES = ['Knight', 'Mage', 'Rogue', 'Rogue_Hooded', 'Barbarian']

const [srcDir, outDir] = process.argv.slice(2)
if (!srcDir || !outDir) {
  console.error('usage: node scripts/optimize-models.mjs <src-dir> <out-dir>')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
await MeshoptEncoder.ready

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })

const kb = (p) => `${(statSync(p).size / 1024).toFixed(0)} KB`

for (const name of SOURCES) {
  const src = join(srcDir, `${name}.glb`)
  const out = join(outDir, `${name.toLowerCase()}.glb`)

  const doc = await io.read(src)
  const root = doc.getRoot()

  // NOTE: Animation.dispose() alone leaves the channel and sampler properties
  // (and therefore every animation accessor) alive, so `prune()` cannot see the
  // garbage and the file stays ~1.4 MB. Tearing down channels and samplers
  // explicitly first is what actually drops the accessors.
  let dropped = 0
  for (const anim of root.listAnimations()) {
    if (KEEP_ANIMATIONS.has(anim.getName())) continue
    for (const channel of anim.listChannels()) channel.dispose()
    for (const sampler of anim.listSamplers()) sampler.dispose()
    anim.dispose()
    dropped++
  }

  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256] }),
    quantize(),
    meshopt({ encoder: MeshoptEncoder, level: 'high' })
  )

  await io.write(out, doc)
  console.log(
    `${basename(out).padEnd(20)} ${kb(out).padStart(9)}  (${dropped} klip dibuang, sisa ${root.listAnimations().length})`
  )
}
