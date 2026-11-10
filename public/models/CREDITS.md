# Model credits

All 3D character models in this folder are **CC0 (public domain)** — free for
personal and commercial use, no attribution required. Credits are listed here
anyway as a courtesy to the authors.

| Files | Pack | Author | Licence |
| --- | --- | --- | --- |
| `knight.glb`, `mage.glb`, `rogue.glb`, `rogue_hooded.glb`, `barbarian.glb` | [KayKit Character Pack: Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) | Kay Lousberg ([KayKit](https://kaylousberg.itch.io/)) | CC0 1.0 |

Source repository (raw GLBs):
<https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0>

## How these files were produced

The upstream GLBs ship ~3.6 MB each with 76 animation clips. They are processed
by `scripts/optimize-models.mjs`, which:

1. keeps only the clips the game plays (`Idle`, `Walking_A`, `Running_A`,
   `Jump_Start`, `Jump_Idle`, `Jump_Land`, `1H_Melee_Attack_Chop`, `Cheer`, …),
2. drops the orphaned accessors those clips leave behind,
3. downsamples the gradient atlas to a 256 px WebP, and
4. applies `KHR_mesh_quantization` + `EXT_meshopt_compression`.

Result: ~480 KB per character (2.4 MB total).

Regenerate with:

```sh
node scripts/optimize-models.mjs <src-dir> public/models
```

`<src-dir>` must contain `Knight.glb`, `Mage.glb`, `Rogue.glb`,
`Rogue_Hooded.glb` and `Barbarian.glb` exactly as downloaded from the repo above.
