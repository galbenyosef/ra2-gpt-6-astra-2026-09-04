# Authored HD runtime samples

The [third batch](batch-three/README.md) currently adds one playable-preview
curved dirt-road GLB. Five other requested assets remain reviewed references
pending external generation approval; they are not yet runtime models.
Bootcamp's default training field combines existing environment GLBs and the ready
tree/road assets from batches two and three; see [Bootcamp rendering](../../src/bootcamp/README.md).

Four optimized static models and one animated Tanya model supply authored HD
sprites to the existing Canvas 2D game renderer. Original SHP/VXL/TMP art, maps,
reference screenshots and downloaded generation masters are not stored here.

```text
external reference/master -> models/<asset>/30k.glb + generation records
external Tanya rig -> tools/tanya-motion -> models/tanya/tanya-actions.glb
                                            -> sprites/tany.png + remap mask
other static models -> legacy baker -> vehicle/building PNG + remap masks
inventory.json -> distributed-file sizes and hashes
```

## Models and recovery

The four `30k.glb` files target about 30,000 triangles each, using 1K WebP textures
and ordinary glTF geometry without a Draco/Meshopt dependency. Their `30k.json`
files record actual sizes, hashes and optimization settings. `master-record.json`
and `prompt.txt` describe inputs kept in the separate local archive; task IDs and
runtime meshes do not restore lost high-resolution geometry.

Tanya's `tanya-actions.glb` reuses the Meshy rig with 24 joints and 28 clips:
21 distinct named actions, five aliases/placeholders and two water transitions.
The body and two independently animated rigid pistols share geometry buffers;
total geometry remains 29,827 triangles. The model is about 4.49 MB. Its original
rigging output did not include normal/roughness maps, and its hands have no finger
joints. See [action evidence](../../tools/tanya-motion/action-reference.md) and
`models/tanya/motion-manifest.json` for measured outputs and limitations.

## Canvas preview and rebuilding

Run `npm run viewer:glb` for static model inspection. Use `npm run viewer:motion`
with `RA2_ORIGINAL_ASSETS` for the animated 3D/source viewer and `/canvas/` map.
The map loads PNGs and masks, not Three.js or GLB. Every HD vehicle/Tanya has an
original-art comparison beside it, synchronized without adding another game unit.

The current Tanya atlas retains 619 source indices: 515 named slots and 104
source-only inspection slots, plus 800 denser movement/transition frames. It has
source-key limb poses, per-action pistol visibility, throw/catch/drop, asymmetric
firing and diving. The character is faded/tinted below water; map water itself is
original. Torso remap preserves skin, weapons and non-team clothing regions.

Use the motion viewer's **local** bake button for Tanya; remote pages cannot
write atlases. Follow [motion tools](../../tools/tanya-motion/README.md) to build
and inspect a candidate. Refresh `inventory.json` after selecting final assets.
The legacy `tools/canvas-hd-preview/bake.mjs` uses static meshes and can overwrite
Tanya's skeletal atlas; restrict it to the intended historical/other samples.

Vehicles/buildings still use legacy body recoil, damage/repair and other preview
feedback. These effects do not establish independently animated turrets/tracks,
a full construction sequence or newly supported gameplay rules.

## Original map and action inspection

Water, shores, roads, clear tiles and the mountain patch come from locally
installed original assets. The preview validates their availability instead of
substituting generated terrain. The slope patch preserves `valley.map` source
cells `(83,86)` over `13×9` tiles, placed at `(24,26)` in the preview.

Map routes loop crawl/prone fire, swim/tread/water fire and slope movement. The
**轮播全部动作** control, or `/canvas/?tour=1`, visits all 21 Tanya actions on that
same map. Pause, slow motion, frame stepping, facing and team color controls
remain available. Automatic targets keep 2% HP for repeated hit inspection;
normal game speed, damage, pathfinding and death rules are unchanged.

## History and storage

The `hifi` branch was rewritten to omit the former LFS master archive and redundant
comparison files. Runtime samples need no LFS download. Previously uploaded LFS
objects can still occupy remote storage until GitHub purges them; rewriting Git
history alone does not release that quota. Legacy unrigged Tanya drafts may remain
for historical reproduction, but the source-aligned skeletal atlas supersedes them.
