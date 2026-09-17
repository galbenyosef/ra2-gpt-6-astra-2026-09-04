# Game simulation

Deterministic tile-space gameplay, independent of the DOM and renderer.

```text
index.ts -> types.ts + data.ts + engine.ts
engine.ts -> pathfinding.ts
engine.test.ts -> normal skirmish and debug behavior
bootcamp.test.ts -> model whitelist, training rules and skirmish isolation
```

`GameOptions.mode` defaults to `skirmish`. Bootcamp uses the verified model catalog
in `../bootcamp/catalog.js` for initial entities, production and spawn validation.
It starts with a supported construction yard, maintains 99,999,999 local credits,
completes local production immediately, bypasses faction/tech/producer requirements,
and retains occupancy, exploration, bounds and terrain checks. Naval production
searches for available water; unavailable terrain rejects recruitment explicitly.

Bootcamp opponents remain actual damageable entities. Their AI and autonomous unit
updates are disabled, including retaliation and pursuit. Automatic elimination is
disabled in training. Unsupported transformations (yard to MCV) and support units
are rejected. Skirmish follows the existing AI, prerequisites and victory rules.

Run `node --import tsx --test src/game/*.test.ts`. The existing simulation class
exceeds the standard file-length limit; preserving its private state boundaries
avoids an unrelated engine rewrite during this integration.
