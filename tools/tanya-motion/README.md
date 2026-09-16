# Tanya motion reconstruction

Author editable 3D skeletal actions from the original `TanyaSequence` and SHP
poses, using the existing Meshy rig. This is reference-based reconstruction,
not recovery of Westwood's original skeleton.

```text
local art.ini/SHP -> catalog.mjs -> action-keys.mjs / crawl-keys.mjs
                                   -> poses.mjs + props.mjs -> build.mjs
                                        -> shared GLB -> bake-atlas.mjs
                                        -> viewer.mjs / Canvas map comparison
```

## Run and rebuild

```sh
RA2_ORIGINAL_ASSETS=/path/to/original/assets npm run viewer:motion
npm run motion:test
RA2_PYTHON=/path/to/python node tools/tanya-motion/build.mjs /path/to/rig-trial .cache/candidate
```

The rig trial needs `rigged.glb`; Python with Pillow runs `mesh-regions.py` to
identify the source-specific pistol and torso regions. `build.mjs` writes a GLB
and manifest to the selected directory without altering the source master.

Port 4179 serves the 3D/source comparison; `/canvas/` uses the existing game's
Canvas 2D renderer and original map. The local 3D bake button writes the Tanya
atlas and mask. Remote pages cannot write files. For an authorized remote tunnel,
set `RA2_PREVIEW_HOST` to its exact hostname when starting the server.

To inspect a candidate without changing the live assets, copy `assets/hd` into
an ignored candidate directory, replace only its Tanya GLB/manifest, then run:

```sh
RA2_HD_ASSETS=.cache/candidate-hd RA2_ORIGINAL_ASSETS=/path/to/original/assets PORT=4181 npm run viewer:motion
TEST_ORIGIN=http://127.0.0.1:4181 node tools/tanya-motion/inspect-actions.mjs
TEST_ORIGIN=http://127.0.0.1:4181 node tools/tanya-motion/verify-actions.mjs
```

The candidate server's local bake button writes into that candidate HD directory.
Bake before running the Canvas check. Verify the selected outputs before copying
them to `assets/hd`; refresh `inventory.json` hashes after the final bake.
Do not use the old `tools/canvas-hd-preview/bake.mjs` for skeletal Tanya: its
static-mesh output would overwrite the new atlas.

## Current coverage and evidence

See [all-action observations](action-reference.md) for source ranges, poses and
limitations, and [the accepted crawl trial](crawl-reference.md) for its history.
There are 28 clips: 21 distinct source actions, five aliases/placeholders and two
swim/tread transitions. The first 619 sprite slots retain their source indices;
515 are named, while 104 remain explicitly source-only. Another 800 dense frames
serve locomotion and water transitions.

`locomotion.mjs` keeps contact stride/timing separate from source inspection.
Running uses a 2.4 m stride and 0.72 s cycle; the map advances phase from travel
distance. Swimming/treading use 1.35 s cycles. Other clips retain the 12 fps
preview convention. Unit speed, damage and movement rules are unchanged.

`team-material.mjs` shares the torso selection between 3D color and Canvas mask,
and shades the underwater character without replacing original terrain.
`props.mjs` provides independent rigid pistols, including single-gun firing and
throw/catch/drop motion. The hands retain closed grips without finger joints.

Use **轮播全部动作** on the map, or open `/canvas/?tour=1`, to cycle through the
21 actions beside their original counterparts. Water actions move the pair into
original water. Manual frame controls stop the tour; pause and speed controls
use the game clock. Deaths hold their last frame before the preview repeats.

Tests inspect delivered bones, props and source slots; passing tests alone does
not establish visual fidelity. `verify-actions.mjs` checks the actual browser and
all-action tour; `verify-crawl.mjs` retains the focused crawl checks. Screenshots,
original art and downloaded masters stay in ignored caches. No new Meshy task
was submitted. Generated manifests and frame tables may exceed text-size limits.
