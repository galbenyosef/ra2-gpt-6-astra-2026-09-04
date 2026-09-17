# Bootcamp integration design

The authorized Bootcamp specification reuses the skirmish map, simulation, controls,
players and production UI. This Codex-created worktree is the task's isolated checkout.

```text
Mode selection -> shared lobby -> GameEngine(mode)
                                  | finite resources / whitelist / passive targets
                                  v
                        BattlefieldRenderer (input, camera, terrain, HUD)
                             | 2D original sprites
                             | lazy ModelLayer (real GLB / WebGL)
                             + one application animation frame and engine clock
```

`src/bootcamp/catalog.js` owns the verified identity, original sprite, GLB path,
scale and forward axis. The old model inspector re-exports it. Both engine and UI
restrict production; automatic spawns and transformations obey the same catalog.
Vite publishes only those authored GLBs at hashed `app/models` paths, distinct
from browser-private originals. Loading uses abortable fetch, explicit fallback,
and per-match disposal. Native terrain remains Canvas artwork; units and buildings
are actual lit, animated GLBs composited at the identical map projection.

Risks and checks: GLB loading peak memory (sequential decode); missing files/context
loss (2D fallback); changing modes while loading (cancellation and battle ownership);
state continuity (same engine/controller with no separate timer); naval spawning
(search actual unoccupied water, reject if none); faction unlocks and gifted miners
(engine tests); movement headings, clips, owner markers and Rhino mask (real browser).

No new assets, paid generation, external uploads, deployment or merging are included.
Original-art evidence stays under ignored `.cache/` rather than committed demo media.

## Local installer reuse

The preparation screen may probe a loopback-only Vite endpoint in development or
local preview. Detect the pinned installer filename (including the existing CLI
cache name) in the checkout, main Git checkout, their shallow cache directories,
or Downloads; an explicit `RA2_LOCAL_INSTALLER` can override discovery. Return only
availability and size. On a button click, stream that one file to the browser and
pass it to the existing file verification/conversion worker. Never fall back to an
Internet Archive download on failure. Reject remote sockets, non-loopback Host,
foreign Origin and requests without the local-only header. No endpoint or installer
file is emitted in the static build. Keep both root and subpath URLs supported.
