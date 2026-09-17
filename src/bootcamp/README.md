# Bootcamp rendering

Main-app Bootcamp keeps one `GameEngine`, map, controller, selection and command
hooks across 2D/3D switches. Rendering and camera projection are presentation state.

```text
training-map.ts -> shared map cells / elevations / scenery / spawns
native-highland.ts -> native 2D flat tops, exposed rock sides and ramp projection
catalog.js      -> engine + sidebar + Vite actor GLB publication
environment-catalog.js -> nine existing terrain/road/tree GLBs
switcher.ts -> model-layer.js -> actors + team-color.js
                            -> environment-scene.js (instanced terrain)
                            -> camera.js (projection / raycasting)
                            -> terrain-materials.js (continuous road / shore materials)
                            -> resource-scene.js (quantity-driven mineral instances)
                            -> overlays.js (effects / placement)
```

The 12 verified game types have explicit original sprite identities, actual GLB
paths, cell-space size and measured forward axes. Three other entries are environment
inspection assets, never production types. The tool catalog re-exports this registry.

`model-layer.js` renders terrain and actors through the same active WebGL camera.
It uses engine time for existing clips, and mesh raycasting for picking. It owns no
simulation loop or game state. The shared controller routes pointer input through
the active projection. `switcher.ts` owns per-match
abort/disposal, handles import/model/context failure and always begins in 2D. Loading
keeps 2D interactive. Returning to the lobby disposes the layer and aborts pending loads.

The default 48×40 Asset Training Field uses grass, ocean, plateau, ramp, three trees
and straight/curved roads already in the repository. Native 2D consumes the same
terrain, scenery and elevation data. The rock/ramp exhibit stays blocked in both
views; this does not introduce elevated pathfinding. 3D supports isometric,
perspective and top presets, 45° turns, Alt-left orbit, middle pan and anchored zoom.
Roads retain their authored curve/ruts, with world-space dirt variation, gravel and
feathered terminal edges. Sand and shallow-water shading follow actual water cells;
thin bank faces close the existing ground/water height gap. Waves use engine time.
Instanced ore/gem stones and underlying soil track actual remaining resources and
visibility; empty cells show no minerals. These details never enter ground picking
or change simulation data. Effects, fog and placement follow the same camera/clock.
Other imported maps use this available terrain set; unsupported scenery has no 3D
model. Unmodeled neutral buildings remain excluded from the training simulation.
No alternative unit model or box is used for unsupported game types.

The training-field 2D exhibit projects native grass onto a continuous raised top
and its +y ramp. Only exposed height boundaries receive a sampled native rock face;
full tall cliff sprites are not repeated inside the plateau. Simulation elevations
and blocked cells remain unchanged. Ordinary custom/editor and original maps keep
their existing terrain rules. `browser_bootcamp_highland.mjs` checks actual top and
side pixels, zoom/pan, and exact state preservation across renderer switches.

Tanya and Conscript use ready/walk/fire clips; Rocketeer uses hover/fly/firefly;
Squid uses ready/swim/attack; Rhino and Destroyer use ready/attack; Barracks uses work.
Clips follow actual commands/shot time. Other existing inspection-only poses remain
available in the old preview, not added as gameplay orders. Full deaths, independent
Apocalypse/miner turrets, tracks, building construction and repair animation are absent.
Only Rhino has a verified paint mask; all models show owner-colored ground markers.

Vite publishes the 12 actor and nine environment GLBs under hashed `app/models`
paths. Models load sequentially on the first 3D request and are cached on demand.
They do not enter the original `/assets` service-worker route. No original media is
bundled. See [verification](../../docs/bootcamp-verification.md) for reproduction.
