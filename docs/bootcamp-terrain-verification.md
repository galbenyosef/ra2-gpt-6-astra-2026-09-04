<!-- Local terrain rendering increment, visual evidence and reproduction. No original media is published. -->
# Bootcamp terrain detail

Local baseline: `9b42b0364c5f5fa473b66375081c0fe40a238074` from
`codex/bootcamp-shared-renderers`. The independent branch
`codex/bootcamp-natural-terrain` adds only rendering detail and tests; the shared
48×40 field, engine, cell topology, elevations, spawns and resource quantities are
unchanged. Version: 0.4.1. No GLB replacement, paid generation, upload or deployment.

## Visible changes

- Existing straight/curved road GLBs retain their width, centerlines and wheel ruts.
  Continuous world-space color/gravel variation reduces repetition, and terminal
  cells feather into underlying grass rather than ending at a square texture edge.
- Ore/gems use two instanced layers of irregularly distributed stone/mineral facets.
  Stones remain within their resource cell. Counts and sizes shrink with actual
  remaining quantity; exhausted or invisible cells contain no visible minerals.
  Subtle soil shading also disappears with depletion. No decorative ore is added.
- Existing ocean/grass surfaces gain wet sand, shallow-water color and irregular
  wave normals. A thin vertical bank closes the original 0.035-cell height gap.
  Every coast derives from actual neighboring water cells; void/map borders do not
  invent beaches. Waves use engine time, so pausing freezes them.
- Added geometry is excluded from picking surfaces. Ground elevation and command,
  building placement, land/sea passability and selection contracts remain intact.

The materials read a tiny map mask; quantity updates change its resource channel.
Mineral transforms update only when quantity/visibility changes. The default field
adds three draw calls: stone, mineral facets and bank faces. Original model bytes
and their 79 MB first-load cost are unchanged.

## Verification

- `npm test`: 123 passed, no failures/skips, with ignored local original-asset links.
  Resource regression covers ore/gem quantity, visibility restoration, cell bounds
  and no map mutation. A land-only regression failed with a null instance color
  buffer before the empty-bank guard, then passed after the fix.
- Root and `/ra2-bootcamp/` production builds pass. Source/built-media isolation and
  `git diff --check` pass; originals never enter the output. Existing Vite large
  Three.js chunk and 7-Zip externalized-module warnings remain.
- Production `browser_bootcamp.mjs`, `browser_bootcamp_camera.mjs`,
  `browser_bootcamp_motion.mjs` (64 headings), and `browser_bootcamp_lifecycle.mjs`
  pass. They verify exact shared object/state roundtrips, real selection/orders,
  rotated movement, placement in all three camera presets and failure/disposal.
- `browser_bootcamp_terrain.mjs`: 48 near/far views across three presets and four
  directions; exact paused map/entities/players/time/ore remain unchanged. A real
  miner collects the last 11 ore units and every associated stone/soil disappears.
  Visibility restoration and depletion survive renderer switching. An uploaded
  land-only map also renders successfully. No JavaScript or WebGL shader errors.
- Actual UI rotation/screenshot inspected with agent-browser. Local production
  homepage Lighthouse: performance/accessibility/best-practices/SEO all 100.

## Local preview and evidence

Production preview: <http://127.0.0.1:4212/ra2-bootcamp/>. Development: port 4211.
Dedicated Chrome profile: `.cache/terrain/browser`, CDP 9231. Other task services
and browsers were not changed. Browser originals are private to this origin/profile;
a fresh browser can reuse the detected local installer through the existing button.

```sh
RA2_BASE_PATH=/ra2-bootcamp/ npm run build
RA2_BASE_PATH=/ra2-bootcamp/ npm run preview -- --port 4212 --strictPort
RA2_CDP_URL=http://127.0.0.1:9231 \
RA2_BROWSER_URL=http://127.0.0.1:4212/ra2-bootcamp/ \
node scripts/browser_bootcamp_terrain.mjs
```

Ignored evidence: `.cache/terrain/before-{field,road,ore,coast}.png`, final
`.cache/terrain/views/{preset}-{rotation}-{subject}.png`, `land-only.png`,
`agent-browser-review.png`, browser/build/test logs and `lighthouse.json`.
These screenshots contain original HUD media and must not be committed or uploaded.

## Remaining visual limits

The training map intentionally has a straight shoreline; this increment does not
reshape it. Beaches/shallow water are material transitions, not new walkable terrain
or a tide simulation. Roads remain low-relief authored surfaces, not deeply rutted
meshes. Minerals are lightweight procedural stones, not scanned geology. Grass
retains its existing texture and may still repeat at high zoom. Existing trees,
actors, plateau/ramp geometry and their prior limitations are unchanged.
