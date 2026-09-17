<!-- Product entry, local startup and links to detailed gameplay and verification guides. -->
# Fan Re-created Red Alert 2

An independent browser RTS with original artwork prepared on the player's device.
Choose **Skirmish / 遭遇战** to fight computer opponents, or **Bootcamp / 新兵训练营**
to freely build and recruit supported units while practicing on the same maps.

Created by [Victor Zhou](https://zzn.im) in a one-shot experiment on 2026-09-04 using
ChatGPT 6 Astra, with subsequent development recorded in Git. The original result
remains at [v0.1.0](https://github.com/xinbenlv/ra2-gpt-6-astra-2026-09-04/commit/3b9e9eaa2aa3b13db1f1bb1daca0f833d48986bf).

## Play

[Play the published version](https://xinbenlv.github.io/ra2-gpt-6-astra-2026-09-04/).
Bootcamp in this checkout is **v0.3.0**; a local implementation does not update that site.

```sh
npm ci
npm run dev
```

Open the printed localhost URL. Choose a mode. If originals are not prepared, use
the browser's consent/download or local installer import flow. Files are verified,
converted and stored locally; the published app never hosts or uploads original media.
The first screen also retains asset preparation, language selection and map editing.

Local dev/preview detects an existing installer in the checkout, shared Git checkout,
shallow `.cache` folders or Downloads and offers **Use local Red-Alert-2-Multiplayer.exe**.
It skips the archive download, then verifies and converts the file in your browser.
For another location, set `RA2_LOCAL_INSTALLER=/path/to/Red-Alert-2-Multiplayer.exe`
when starting Vite. This loopback-only helper is absent from static deployments.

- Skirmish retains nine countries, configurable teams/opponents, native maps, fog,
  terrain, mining, production, combat, superweapons and victory conditions.
- Bootcamp defaults to traditional Canvas 2D on **every** entry. Open the lower-left
  **Debug Panel** and select **2D / 3D** to change the actual renderer in the same match.
- Bootcamp has immediate production and replenished finite credits. It unlocks the
  12 verified model types across factions. Bounds, occupancy and land/sea/air rules
  still apply. Opponents remain damageable passive targets; training does not end
  automatically when bases or armies are destroyed.
- The 3D view draws actual authored GLBs over the same original terrain. Selection,
  commands, IDs, positions, health, teams, resources and time survive switching.
  Failed model loading or WebGL context loss returns to usable 2D with a clear message.
- Map editor, portable `.ra2map` sharing and original `.map` imports remain available.

## Models and limits

Supported: Tanya, Apocalypse, Allied Construction Yard, Nuclear Reactor, Soviet
Refinery, War Miner, Rocketeer, Conscript, approved Rhino v4, Destroyer, Allied
Barracks and Giant Squid. Environment assets and unfinished third-batch references
are not recruitable. The UI and engine enforce the same verified catalog.

This is an isometric hybrid: terrain/scenery/effects use original Canvas artwork,
while actors use WebGL. It does not add free-orbit terrain. Existing supported
skeletal/mechanical clips follow gameplay; missing death, track, turret and building
motions are documented in [rendering notes](src/bootcamp/README.md). Rhino retains
its embedded paint mask; other actors show owner-colored ground markers.

## Build and verify

```sh
npm test
npm run build
npm run repo:check
node --import tsx scripts/check-source-only.ts --build
npm run preview
```

For subpath hosting, set `RA2_BASE_PATH=/your-path/` on both build and preview.
Authored GLBs are emitted at content-hashed `app/models` paths and loaded on demand.
Original `/assets` and `/maps` remain browser-private; Vite public copying stays off.
The footer embeds the checkout commit and its commit time. No deployment is implied.

[Bootcamp acceptance](docs/bootcamp-verification.md) · [Detailed game/asset/editor guide](docs/game-guide.md) ·
[Source map](src/README.md) · [Browser tests](scripts/README.md) · [Local model tools](tools/README.md) ·
[Earlier verification](docs/verification.md) · [Asset workflow](.agents/skills/ra2-hd-blender/SKILL.md)

Local screenshots and animation evidence include original media and stay under
ignored `.cache/bootcamp/evidence/`; they are not published as README media.

## Rights and contact

Independent fan project, with no affiliation, sponsorship or endorsement from EA,
Westwood, their licensors, OpenAI or ChatGPT. Original game trademarks/media belong
to EA and their respective rights holders; OpenAI/ChatGPT marks belong to their
owners. No infringement is intended, no ownership of originals is claimed, and
this project grants no third-party media license. Rights/takedown contact:
[hi@zzn.im](mailto:hi@zzn.im).
