# Canvas HD preview

The real Canvas 2D renderer displays authored sprites beside synchronized original
units, using original water, shores and mountain tiles. It never loads a GLB.

```text
server.mjs -> original art + HD sprite manifests -> main.ts -> BattlefieldRenderer
                                                  |-> map-demos.ts
                                                  |-> comparison-pairs.ts
                                                  |-> frame-inspector.ts
../tanya-motion/ -> skeletal clips -> packed Tanya atlas
bake.* + procedural-poses.js -> legacy vehicle/building/Tanya draft baking
```

Tanya's current atlas maps 515 named source frame slots to bone-driven poses.
The complete 619-frame index is retained; unassigned source slots are reference-only
in the inspector. This is a pose reconstruction, not exact source motion recovery.
Land and water actions can be selected and stepped in the same map. Water actions
move the inspection pair to the original pool, then restore their land position.

Automatic routes show crawl/prone shooting, swimming/treading/water shooting, and
slope traversal. The preview keeps targets at 2% HP. Normal game rules are unchanged.
The existing `test-*.mjs` scripts cover comparisons, directions and original terrain.
