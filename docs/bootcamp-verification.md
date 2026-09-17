<!-- Implementation contract and measured acceptance results for the main-application Bootcamp. -->
# Bootcamp verification

This local implementation uses one `GameEngine` and one battlefield input/controller
through every 2D/3D roundtrip. Bootcamp defaults to Asset Training Field, not Arctic
Circle. Both renderers consume its same cells, elevations, scenery and game state.
The WebGL presenter renders existing terrain/actor GLBs through one rotating camera;
resource overlays, combat feedback and the HUD still follow the same simulation.
No preview iframe or second application port participates in gameplay.

See [terrain detail verification](bootcamp-terrain-verification.md) for the local
0.4.1 road, mineral and shoreline rendering increment and its independent preview.

## Checks performed

- `npm test`: **121 passed, 0 failed, 0 skipped** with existing local original map
  resources exposed through ignored `public/assets` and `public/maps` links. In a
  source-only checkout, the seven original-map tests skip explicitly.
- `npm run build`: passed for `/` and `/ra2-bootcamp/` with originals present locally.
  Source and built-media isolation checks passed. The 12 actors and nine environment
  models total 79,016,084 bytes, emitted under hashed `app/models` paths.
- `browser_bootcamp_camera.mjs`: passed against dev and production subpath preview.
  All three presets and four camera directions select and command real units.
  Preset changes and renderer roundtrips preserve object identity and exact paused
  game state. Alt-orbit issues no game command; middle pan and anchored zoom work.
  Real building placement passes in every preset; 2D hides the camera toolbar,
  returning to 3D remembers the view, and missing terrain GLBs recover to 2D.
- `browser_bootcamp.mjs`: passed against development and production subpath previews.
  Actual Chinese/English home entry, default 2D, all 12 production icons, immediate
  recruitment/building placement, visible GLBs, unsupported-type rejection, repeated
  roundtrips, exact state/object identity, canvas selection, right-click movement,
  animation phase, context loss, missing model fetch, retry, exit/re-entry and normal
  skirmish all passed. Twelve animation frames called the engine twelve times.
- `browser_bootcamp_motion.mjs`: **64/64** eight-direction travel cases in the main
  app, using an uploaded editor map and independently recorded model forward axes.
  The deliberately wrong 90-degree mapping failed the negative control. Real attacks
  from Rhino, Tanya, Rocketeer, Destroyer and Squid damaged targets and selected their
  authored firing clips. Real right-click attacks passed in both 2D and 3D. Tanya,
  Conscript, Rocketeer and Squid produced finite, changing skinned vertices.
- `browser_bootcamp_lifecycle.mjs`: passed on the production subpath. Input remains
  active while model fetch is held; choosing 2D during loading wins over late results;
  exit aborts fetch; late completion cannot switch the next battle; old simulation
  stops; live English/Chinese translations follow the selected language. The asset
  preparation and map editor entries retain working routes back to mode selection.
- Earlier unchanged tool regression `tools/batch-two/verify.mjs`: **64/64** travel cases,
  wrong-heading negative control, actual attack/move-resume, clips and time/camera UI.
- Earlier unchanged Rhino mask regression `tools/batch-two/verify-team-color.mjs`: four views,
  14,228 / 14,292 / 14,543 / 14,214 changed paint pixels; **0 changed pixels outside
  the mask** in every view. Original geometry/PBR bytes remained unchanged.
- Real UI inspected using agent-browser and saved screenshots. Production homepage
  Lighthouse scored **100** for performance, accessibility, best practices and SEO.
  The JSON report stays in the ignored evidence directory.
- Existing skirmish/editor browser scripts now select the new mode entry after
  navigation and reload; their existing assertions are retained and syntax-checked.

## Regressions found and fixed

1. A 3D flying unit behind another actor's projected bounding box selected the wrong
   actor. The actual canvas test failed before the fix; mesh raycasting now passes.
2. Rocketeer movement selected `hover` because aircraft do not populate ground paths.
   The motion test failed with `hover !== fly`; recent engine displacement now selects
   `fly`, and actual skeletal movement passes.
3. Switching English to Chinese during a battle left the new renderer legend/status
   in English. The live-language test failed before preserving the Chinese source
   text for the existing translator; both directions now pass.
4. Lighthouse reported a favicon 404. A local empty favicon removes that request.

## Reproduce

Use a dedicated Chrome profile with browser-private originals prepared for the target
origin and base path. The tests never download an installer themselves. For local
verification, this task copied existing extracted originals into only that test
profile's CacheStorage, not the application bundle or a published media directory.

```sh
RA2_BASE_PATH=/ra2-bootcamp/ npm run build
RA2_BASE_PATH=/ra2-bootcamp/ npm run preview -- --port 4208 --strictPort
RA2_BROWSER_URL=http://127.0.0.1:4208/ra2-bootcamp/ node scripts/browser_bootcamp.mjs
RA2_BROWSER_URL=http://127.0.0.1:4208/ra2-bootcamp/ node scripts/browser_bootcamp_motion.mjs
RA2_BROWSER_URL=http://127.0.0.1:4208/ra2-bootcamp/ node scripts/browser_bootcamp_lifecycle.mjs
RA2_BROWSER_URL=http://127.0.0.1:4208/ra2-bootcamp/ node scripts/browser_bootcamp_camera.mjs
```

`RA2_CDP_URL` defaults to `http://127.0.0.1:9227`. Screenshots, JSON motion report,
Lighthouse output and test logs stay under ignored `.cache/bootcamp/`. Local tools
were separately tested on port 4209; existing 4179/4193 services were untouched.

## Scope and limits

- The default field uses existing grass, water, rock, ramp, trees and roads. Its
  rock/ramp exhibit stays blocked in both renderers; elevated pathfinding is absent.
  Other imported maps use the available terrain set, and scenery without a model is
  absent from 3D. Neutral buildings without verified models remain excluded from
  the training simulation. Environment props never become recruitable combat types.
- All opponents are real passive targets. This revision disables retaliation as well
  as pursuit; ordinary skirmish retains its existing AI.
- The approved Rhino has a real embedded paint mask. Other models retain authored
  materials and use team-colored ground markers, not blanket recoloring.
- Only gameplay-relevant existing clips are selected automatically. Inspection-only
  poses remain in the standalone tool. Full death sequences, independent Apocalypse
  and miner turrets/tracks, and complete building construction/repair animations are
  not implemented; normal combat effects are not claimed as skeletal motion.
- Training does not fabricate water. Naval production fails clearly on a land-only
  map or if no unoccupied water is available. Construction keeps bounds, occupancy,
  terrain and exploration checks, while allowing rebuilding after losing a yard.
- The first 3D load fetches about 79 MB of authored GLBs. Existing Vite warnings for
  the 7-Zip externalized Node module and the lazy Three.js chunk remain; builds pass.

No new paid generation, credentials, external upload, merge or production deployment
was performed. Parent asset commits were applied locally by cherry-pick after checking
patch equivalence. Push remains subject to the parent task's existing approval block.
