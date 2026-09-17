# Application source

Browser application code uses TypeScript, native Canvas and a lazy Three.js actor
presenter. Original assets stay in the player's browser storage.

```text
main.ts -> mode menu -> asset preparation -> lobby/editor -> battle
  game/                deterministic simulation, data and tests
  renderer.ts          original terrain, controls, sprites, minimap and HUD
  bootcamp/            verified GLBs and switch lifecycle
  assets.ts            browser original-art/audio consumers
  asset-setup/worker   local download and conversion
  maps/custom-*        original and portable editor maps
  map-editor*          editor UI and terrain painting
  i18n.ts / urls.ts    locale and deployment-path boundaries
```

Bootcamp and skirmish share the lobby and engine. All new production restrictions
are enforced in the engine as well as the sidebar. The optional WebGL layer changes
presentation without replacing the engine or controller. See `bootcamp/README.md`.

Several existing modules (`engine.ts`, CSS and the compact main UI templates) exceed
the normal byte/line guideline. Their tightly coupled legacy state is retained for
this integration; new render lifecycle/model code is split into the Bootcamp folder.
