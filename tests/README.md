# Application regression tests

Node tests cover browser data contracts, original-media boundaries, maps, rendering
metadata and local developer tooling. Gameplay tests live in `src/game/`.

```text
archive-input + browser-storage + service-worker -> original verification/cache
source-only + local-installer                    -> publication and local access
map-* + custom-* + terrain-*                     -> portable map/editor behavior
sprite-* + hd-actions + sound                    -> presentation data contracts
i18n + urls                                     -> language and base-path behavior
```

Run `npm test`. Local-installer tests use synthetic sparse files and a temporary
loopback HTTP server; no original installer or remote network is needed. Real
browser flows live in `scripts/browser_*.mjs` and save evidence under ignored caches.
