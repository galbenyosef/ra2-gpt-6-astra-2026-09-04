<!-- Original-art menus, category visibility, reproducible checks and local evidence. -->
# Menu and options verification

The entry mode selector, lobby, pause, help, status and result dialogs share
locally converted RA2 art. No original image is bundled or committed.

Menu resources use `pudlgbgn.shp` (451×326, dialog.pal), `mnbttn.shp`
(126×25×3, mainbttn.pal), and 18px PCX checkboxes, matching the reference
`GameRes.initUiCssVariables`. Dialog art scales to responsive bounds; button
frames use normal/hover/pressed states.

`SidebarTab.disabled` in the reference is true when its item list is empty.
All four slots remain; our corresponding buttons use frame 2 and cannot receive
pointer or keyboard category selection. Empty production panes have no messages.


Menu acceptance covers both languages at 1280×800 and 1024×600, all option
pages, immediate volume/speed/camera changes, viewport resizing and a same-engine
3D return. Audio unit tests check active channel volumes, disabling effects and
remembered music tracks. The empty-category test fails against d1d9b60 on its
MCV instruction placeholder, then passes on the new implementation.


Run `node scripts/browser_menus.mjs` against port 4226, or set `RA2_BROWSER_URL`.
`RA2_EMPTY_ONLY=1` runs the focused unavailable-category regression. Tests cover
both factions, initial deployment, producer appearance/loss and keyboard cycling.
Menu screenshots are local under `.cache/sidebar/evidence/`, including
`after-menu-{en,zh-CN}.png`, `after-pause-*`, `after-options-*`, `after-audio-*`,
`after-controls-*` and `after-options-3d-*`. Before captures are `before-menu.png`,
`before-lobby.png` and `before-pause.png`.

Display presets constrain the game viewport within the browser window; they do not
change the monitor resolution. Full screen uses the browser API and reports a
rejection inline. Settings apply immediately and survive closing/reopening dialogs
within the page. They are not saved across a page reload. Controls provide edge
scrolling, camera speed and the existing key reference; key remapping is not added.

Readiness schema 6 checks the added menu files. The `--sidebar-only` native upgrade
also refreshes menu resources; browser conversion reuses its verified installer.
Audio tests verify changes to active sound/music channels and music track retention.

Mode descriptions, lobby tutorials, persistent objective coaching and normal-state
renderer captions were removed at the user’s request. The entry has command labels
without explanatory paragraphs. Loading/errors and explicitly opened help remain.


The lobby follows the reference `LobbyForm` structure: compact player rows above
rules, a 632px main map-background panel and a right preview/command rail. The
map picker follows `MapSel`: type list plus a plain map list, sorting/search,
right preview and confirm/cancel commands. Original `mnscrnl` art frames the panel;
list selections and input borders use the original red/yellow colors. Async map
loads cannot overwrite newer selections or a closed picker. See
`node scripts/browser_lobby_skin.mjs` for both modes, languages, two sizes,
filter/sort/cancel/confirm, player-setting retention and actual match startup.

Earlier desktop Lighthouse on a local static build with separate prepared originals:
performance 96, accessibility 100, best practices 100, SEO 100. Vite development
scores are not representative because modules are unminified and unknown text
routes receive the SPA shell. Originals remain absent from the audited dist.

## Rust Alarm fidelity update

The title is Rust Alarm. A skippable CRT/radar splash closes at 3 seconds,
independently of loading, with the requested Victor Zhou / EA fan-remake credit.
The main monitor plays locally converted original RA2 video with Fira typography;
see [video verification](menu-video-verification.md). The right rail uses original
sdtp, sdbtnbkgd, sdbtnanm, sdbtm and lwscrnl frames/palettes. ESC keeps the paused battlefield
behind a native 168px right rail, with options and language switching.

The top toolbar is removed. Original 52×32 command SHPs implement teams 1–3,
type selection, deploy, stop and waypoint mode. Keyboard teams 1–9 and D/H remain.
Names use the reference's 800 ms stationary-hover delay; picking and an explicit
visibility check exclude fogged, dead and transported entities in both renderers.
Colors match rules.ini HSV values, with DarkSky before Purple in mpAllowedColors.

`node scripts/browser_fidelity.mjs` checks the splash deadline, title/credit, color
order, right-aligned ESC menu, languages, group pointer/keyboard commands, actual
queued routes, and 2D/3D tooltips including fog/death. Engine tests cover waypoint
arrival order, replacement, stop and harvesters. Evidence uses `rust-alarm-*.png`
in `.cache/sidebar/evidence/`. Production pagination now tests at 540px height
because removing the top toolbar leaves room for an additional cameo row.
