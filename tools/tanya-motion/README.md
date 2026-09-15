# Tanya motion reconstruction

Reconstruct editable skeletal clips from the original `TanyaSequence` frame layout
and visually inspected SHP poses, using the existing Meshy humanoid rig. This is
reference-based animation authoring, not recovery of Westwood's original 3D rig.

```text
Original art.ini/SHP (local reference only)
    -> catalog.mjs -> poses.mjs -> build.mjs -> tanya-actions.glb
                                               -> Canvas atlas baker
                                               -> original-frame comparison
```

No extra Meshy generation is required. `build.mjs` accepts a local rig trial
folder and writes the authored GLB plus a non-secret manifest to the chosen output.
The Meshy running clip supplies the alternating gait; other poses use joint
constraints and authored keys based on the reference sheets. All named source
sequences retain their frame counts. 12 fps is the existing preview clock.
Unassigned source ranges remain explicitly unmapped rather than invented actions.

Original SHP, screenshots and downloaded rig masters stay outside Git. Keep
runtime files small: one skinned mesh and multiple clips share geometry/textures.

## Run and verify

```sh
RA2_ORIGINAL_ASSETS=/path/to/original/assets npm run viewer:motion
npm run motion:test
node tools/tanya-motion/build.mjs /path/to/rig-trial assets/hd/models/tanya
```

Port 4179 serves a 3D action/SHP comparison and `/canvas/` shows the same frames
on the game map. The local 3D page has a bake button. Remote pages cannot write
atlases. `motion.test.mjs` checks actual bone trajectories, clip coverage, normalized
weights, and named frame bounds; `TANYA_MOTION_GLB` can supply a negative fixture.
The runtime GLB contains 26 sequences including original aliases/placeholders.
The user-facing list exposes the 21 distinct named actions. 515 source slots are
baked; the remaining 104 slots retain original-only inspection. Water deaths sink
below the water plane near the end. No new paid Meshy tasks were submitted.

`viewer.mjs` implements model/source inspection; `bake-atlas.mjs` renders the
packed atlas and skinned team mask; `server.mjs` serves static files and accepts
local-only bake output. Generated JSON inventories can exceed the text-file limit.

For an explicitly authorized remote tunnel, set `RA2_PREVIEW_HOST` to its exact
hostname when starting the server. The default allows local access only.
Validation: five motion/atlas checks and TypeScript passed; the former static
model fails the skeleton/trajectory checks. Both preview pages were loaded over
the remote URL and water-shooting was inspected on the original map.
