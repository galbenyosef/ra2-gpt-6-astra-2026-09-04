<!-- Scope, source-art measurements, repeatable acceptance and local-only evidence. -->
# Native production sidebar verification

Allied and Soviet production sidebars now use original locally converted artwork.
Entry, lobby, pause, help and result dialogs now also use original menu artwork.
Production rules remain unchanged. Bottom commands now include queued waypoints. The same HUD serves Canvas 2D and optional Bootcamp 3D.

## Run locally

```sh
npm ci
npm run dev -- --port 4226
```

Vite reuses a complete `public/assets` and `public/maps` in this or the shared main
checkout. Older converted sets need the added sidebar atlases. Copy the prepared
assets/maps into this worktree first if the shared set must remain unchanged, then:

```sh
RA2_ASSET_CACHE=/path/to/existing/converter-cache npm run assets:setup -- --sidebar-only
```

The cache must contain extracted `mixes`, `game`, `raw` and its Python `venv`.
`RA2_PYTHON` can select an environment with Pillow/PyCryptodome; `RA2_PUBLIC_DIR`
selects the output directory. The command verifies the existing set, exports only
the interface atlases and menu video, verifies the result and writes readiness last. It does not download.
Restart Vite afterwards. Without prepared output, the existing browser preparation
flow remains available. Older browser installations are rejected by schema 6;
preparation reuses the SHA-256-verified cached installer and reconverts locally.
The originals cache namespace remains unchanged; original files never fall through
to a hosted URL. Readiness checks faction/menu PNGs and menu WebM; conversion checks
frame metadata before committing the marker.

## Measured source contract

| Piece | Native dimensions / frames |
|---|---|
| credits / top / radar | 168×16 / 168×32 / 168×110; radar has 33 frames |
| side1 / side2 / side2b / side3 / addon | 168×69 / 168×50 / 168×50 / 168×26 / 168×63 |
| Allied / Soviet tabs | 28×27 / 32×28, 5 frames each |
| Allied / Soviet repair and sell | 64×31 / 52×32, 2 frames each |
| Scroll arrows | 46×25 / 46×27, 3 frames each |
| Production cameo / clock | 60×48; clock has 55 frames |

Compared both local Chrono Divide references at
`src/gui/screen/game/component/Hud.js`, `hud/SidebarIconButton.js`,
`hud/SidebarTabs.js`, `hud/SidebarCard.js`, `hud/SidebarPower.js` and
`GameLoader.js`, then decoded and inspected both actual MIX palettes/frames.
Both referenced Hud implementations match. No reference implementation was vendored.
The faction and menu JSON contracts are shared by conversion and runtime readiness.
See [menu verification](menus-verification.md) for shared dialog art and empty categories.

## Checks

```sh
npm test
npm run build
npm run repo:check
node --import tsx scripts/check-source-only.ts --build
RA2_BROWSER_URL=http://127.0.0.1:4226/ node scripts/browser_sidebar.mjs
RA2_BROWSER_URL=http://127.0.0.1:4226/ node scripts/browser_menus.mjs
RA2_BROWSER_URL=http://127.0.0.1:4226/ node scripts/browser_prepared_assets.mjs
```

`browser_sidebar.mjs` launches isolated headless Chrome. It checks both factions
at 1280×800 and 1024×600: native dimensions, button hit positions, Chinese/English,
pause/status entry, production, pointer placement, repair and sale, 3D recruitment
and a same-engine 2D roundtrip. Skirmish checks halfway clock frame 27, cancellation,
ready-tab indication, pagination and two-item infantry queues. The test freezes
time and adds a producer fixture through the existing inspection handle; commands
under test are dispatched through actual UI pointer actions.

A regression test spans every sidebar height from 311–1100px in both skins. The
pre-fix footer calculation fails at 353px; the fixed version reserves complete
arrow frames. Cache tests reject old versions, missing atlases and truncated clocks.

## Local evidence and limits

Screenshots contain original media and remain ignored under `.cache/sidebar/evidence/`.
They are never attached to the public PR or committed. Inspect before/after pairs:

| Skin | Before | After |
|---|---|---|
| Allied, 1280×800 | `before-allied-1280.png` | `after-allied-1280.png` |
| Soviet, 1024×600 | `before-soviet-1024.png` | `after-soviet-1024.png` |

Also retained: both other viewport pairs, Chinese views, 3D views, ready cards,
production clocks and unit queue counts; `results.json` records acceptance results.

The radar uses the correct static closed/open frames without the source opening
animation. Long translated cameo names are ellipsized at native size; the full
name, cost, description and prerequisite reason are available on hover/focus.
The status button reports players/teams only; this phase does not add diplomacy
rules. Browser schema upgrade uses full conversion,
while the native developer command supports a sidebar-only upgrade.
