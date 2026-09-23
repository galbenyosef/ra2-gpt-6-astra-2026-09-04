# Players can save and resume a match

Skirmish and Bootcamp support manual saves while a match remains active.

1. Open the pause menu with **Esc** or the options button.
2. Select **Save Game / 存档**.
3. Enter a name and select **New Save / 新建存档**.
4. Wait for the success message before closing the page.

Players can select an existing save and confirm **Overwrite** or **Delete**.
The save list shows the name, map, mode, country, save date and elapsed game time.

## Players can load a save from either menu

Select **Load Game / 取档** from the main menu or pause menu.
Select a save and select **Load Game** again. Loading during a match requires
confirmation because the loaded match replaces the current match.

The loaded match remains paused until the player selects **Resume**.
Loading restores production, orders, resources, fog, debug settings, selection,
control groups and the 2D camera. Bootcamp starts in 2D after loading.
Players can then select 3D in the Debug Panel.

The save includes map data for native and imported maps. Each browser still needs
the normal game assets. Saves contain no pictures, audio or models.

## Players can export saves as portable files

Select a save and choose **Export / 导出存档** to download a `.rustalarm-save` file.
Choose **Import / 导入存档** to add a file as a new local save.
Importing a file keeps the current match active and preserves existing saves.
Players can also export the current match directly from the Save Game menu.

Browser saves belong to the current website and browser profile. Clearing site
data removes browser saves. Exported files provide backups and allow transfer
to another browser. The current release supports files up to 32 MB.

## Developers can verify the save format

`save-game.ts` defines the `rustalarm-save` envelope with schema version 1 and
simulation version 1. The validator rejects unsupported versions and malformed data.
Future incompatible gameplay changes must update the simulation version or provide
an explicit migration. Original RA2 save files use a different format.

IndexedDB stores the snapshot and list metadata in one transaction. The transaction
must complete before the interface reports success. JSON export converts typed
arrays into numeric arrays. Import validation restores the specified array types.

The engine snapshot includes identifiers, random state, periodic timers and spatial
buckets. Removed entities can remain in a bucket until the next refresh, so the
snapshot preserves those records. Restoration preserves the scheduled refresh.
The snapshot stores separate base and miner warning times. A `null` time means
the engine has not issued that warning yet.

Run the focused tests with:

```sh
node --import tsx --test src/game/snapshot.test.ts tests/save-game.test.ts
```

Run `npm test`, `npm run build`, `npm run repo:check` and the source-only build
check before release. Run `scripts/browser_saves.py` with Python Playwright and
Chrome against a development server with prepared originals. The browser check
uses a temporary profile and stores evidence under ignored `.cache/saves/evidence/`.

Automatic saves, quicksave shortcuts and cloud synchronization remain outside
the current release.
