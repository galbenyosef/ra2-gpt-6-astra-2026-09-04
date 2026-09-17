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
and per-match disposal. 2D uses native Canvas art; 3D renders the same map and entities
using existing authored terrain and actor GLBs through one rotating camera.

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

## Authored training map and rotating camera

Bootcamp gains a default terrain layout assembled from the existing grass, ocean,
plateau, ramp, tree and road GLBs. It remains one map and simulation in 2D and 3D.
The 3D layer now owns world presentation, camera projection and ground raycasting;
the shared controller retains input, selection and orders. Camera rotation and
isometric/perspective/top presets never rotate entity headings or mutate gameplay.
Ground picking, building footprints, effects, fog and minimap viewport must follow
the active camera. Instanced terrain reuses mesh/material data; disposal and failed
loads retain the existing 2D recovery. No new model generation is needed.
