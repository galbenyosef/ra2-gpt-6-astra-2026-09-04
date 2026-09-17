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
