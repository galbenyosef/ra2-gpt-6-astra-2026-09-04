# Developer and browser checks

Scripts prepare local originals, check publication boundaries and exercise the UI.
Original outputs and browser evidence stay ignored.

```text
assets/ + setup-assets.ts -> local optional extraction / conversion
maps/                    -> map conversion and native-map tests
check-source-only.ts     -> tracked source / production media isolation
browser_setup.py         -> browser download/conversion acceptance
browser_map_editor*.mjs  -> editor, sharing, resize and terrain acceptance
browser_bootcamp*.mjs    -> main-app bilingual switching, models and motion
local-installer.ts       -> loopback-only Vite installer discovery and streaming
browser_local_installer.mjs -> local copy, failure/retry and full conversion
browser_*.py / *.mjs     -> other existing UI regression suites
```

Existing skirmish/editor suites select `mode-skirmish` after navigation or reload.
The setup suite also does so after conversion, cached re-entry and offline reload;
the locale audit re-enters after restoring and rechecking deliberately missing assets.

Bootcamp scripts connect to a dedicated Chrome CDP endpoint (`RA2_CDP_URL`, default
`http://127.0.0.1:9227`) with originals prepared for `RA2_BROWSER_URL` (default
`http://127.0.0.1:4207/`). They drive the mode menu, shared lobby and real battlefield.
They overwrite only their own ignored `.cache/bootcamp/evidence` output. Never run
them against a browser profile with an in-progress game the user wants to retain.

`browser_bootcamp_lifecycle.mjs` checks in-flight input, cancellation and live languages.
`browser_bootcamp.mjs` checks all production icons, identity/state preservation,
loading/context failure, re-entry and loop ownership. `browser_bootcamp_motion.mjs`
uploads a generated map and checks 64 actual movement directions, attacks and
skeletal deformation. They also run against a production preview and a base path.
`browser_bootcamp_camera.mjs` checks the default training map, shared-state switches,
all three camera presets from four directions, actual pointer orders, orbit/pan/zoom,
building placement, remembered view and environment-load failure recovery.

The local-installer browser check uses a fresh context on the same CDP endpoint,
defaults to the port 4208 subpath preview and requires an existing detected installer.
It blocks Internet Archive requests and saves evidence under `.cache/local-installer`.

`browser_bootcamp_highland.mjs` instead launches a dedicated persistent Chrome profile
specified by `RA2_BROWSER_PROFILE`, already prepared for `RA2_BROWSER_URL` (default
port 4216). It checks flat grass pixels and filled front walls at 1× and 2.5×,
after pan, and shared-state 2D/3D roundtrips. Evidence stays under
`.cache/bootcamp/highland` (override with `RA2_EVIDENCE_DIR`). On a Vite dev server,
`RA2_HIGHLAND_BASELINE=1` disables the correction only in that browser and must fail
the same pixel test; it does not modify source or shared game state.
