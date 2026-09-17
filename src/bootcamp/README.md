# Bootcamp rendering

Main-app Bootcamp uses the same `GameEngine`, Canvas controller, original terrain,
map, camera, selection and command hooks as skirmish. Only actor presentation changes.

```text
catalog.js + catalog.d.ts -> engine + sidebar + Vite GLB publication
switcher.ts -> lazy model-layer.js -> Three.js GLBLoader / SkeletonUtils
                  |               -> team-color.js (also used by old preview)
                  + original Canvas terrain / effects / fog / controls
```

The 12 verified game types have explicit original sprite identities, actual GLB
paths, cell-space size and measured forward axes. Three other entries are environment
inspection assets, never production types. The tool catalog re-exports this registry.

`model-layer.js` renders lit models through WebGL into the native isometric projection.
It uses engine time for existing clips, and mesh raycasting for picking. It owns no
simulation loop, camera input listener or game state. `switcher.ts` owns per-match
abort/disposal, handles import/model/context failure and always begins in 2D. Loading
keeps 2D interactive. Returning to the lobby disposes the layer and aborts pending loads.

The original map tiles, resources, scenery, combat effects and fog remain Canvas art.
This is a hybrid isometric 3D view, not a free-orbit terrain reconstruction. Unmodeled
neutral map buildings are excluded from the training simulation; native scenery stays
visible. No alternative unit model or box is used for unsupported game types.

Tanya and Conscript use ready/walk/fire clips; Rocketeer uses hover/fly/firefly;
Squid uses ready/swim/attack; Rhino and Destroyer use ready/attack; Barracks uses work.
Clips follow actual commands/shot time. Other existing inspection-only poses remain
available in the old preview, not added as gameplay orders. Full deaths, independent
Apocalypse/miner turrets, tracks, building construction and repair animation are absent.
Only Rhino has a verified paint mask; all models show owner-colored ground markers.

Vite publishes hashed, self-contained authored GLBs under `app/models` (about 53 MB
combined). Models load sequentially on the first 3D request and are cached on demand.
They do not enter the original `/assets` service-worker route. No original media is
bundled. See [verification](../../docs/bootcamp-verification.md) for reproduction.
