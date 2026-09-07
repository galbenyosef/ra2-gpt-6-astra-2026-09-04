# Authored HD runtime samples

These are the user-approved generated/optimized model samples and PNG sprites used
by the GLB viewer and the main game's Canvas 2D preview. They were authored from RA2
visual references through the earlier ImageGen/Meshy workflow; this directory is
not a copy of the original game's extracted artwork.

- `models/apocalypse-tank/30k.glb`: default 30,000-triangle runtime candidate.
- `models/apocalypse-tank/200k-draco.glb`: 200,000-triangle comparison candidate, real Draco.
- `models/apocalypse-tank/80k-webp.glb`: 79,999-triangle WebP comparison candidate.
- `sprites/`: four transparent PNG atlases plus frame, anchor and density metadata.
  Tank: 16 headings; Tanya: 8 headings; two buildings: one heading each.
- `inventory.json`: file sizes and SHA-256 checksums.

GLB candidates total about 22 MB; PNG atlases about 2.48 MB. These are not complete
animation sets. Original generated high-poly masters remain in ignored local
caches, with no destructive replacement. Ordinary gameplay still uses its existing
artwork unless the HD manifest is explicitly selected in the preview.

To rebake using locally archived masters, start `npm run viewer:glb`, then run
`node tools/canvas-hd-preview/bake.mjs` (or append one sprite ID such as `tany`).
The tank source is included here; the other three master GLBs must be available via
`RA2_MODEL_DIR`. Baking uses Three.js only offline; the battlefield page loads PNG
and renders exclusively through Canvas 2D.

Extracted original sprites, terrain, palettes, installers and archives belong in
`.cache/` or the existing ignored original-art paths, never in this directory.
