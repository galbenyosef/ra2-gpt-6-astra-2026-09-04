"""Verify browser save persistence, file backups and match restoration in an isolated profile."""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get('RA2_BROWSER_URL', 'http://127.0.0.1:4237/')
EVIDENCE = Path('.cache/saves/evidence')
EVIDENCE.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright, tempfile.TemporaryDirectory(prefix='rustalarm-saves-') as profile:
    downloads = str(Path(profile) / 'downloads')
    context = playwright.chromium.launch_persistent_context(profile, channel='chrome', headless=True,
        viewport={'width': 1280, 'height': 800}, accept_downloads=True, downloads_path=downloads)
    errors = []
    page = context.pages[0]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('crash', lambda: print('Browser page crashed', flush=True))
    try:
        page.goto(URL)
        page.wait_for_load_state('networkidle')
        page.get_by_test_id('mode-load').click(timeout=5000)
        page.get_by_text('No saved games.', exact=True).wait_for()
        page.locator('#saves-back').click()
        page.get_by_test_id('mode-bootcamp').click()
        page.locator('#start').wait_for(timeout=60000)
        page.locator('#music').uncheck()
        page.locator('#start').click()
        page.locator('#battlefield-canvas').wait_for()
        page.locator('.debug-panel summary').click()
        page.get_by_test_id('renderer-3d').click()
        page.wait_for_function('document.querySelector("#battlefield-canvas").dataset.renderer === "3d"', timeout=60000)
        selected_id = page.evaluate('''() => {
          const view = window.ra2.renderer, game = window.ra2.game;
          const unit = game.entities.find(e => e.owner === 0 && e.kind === 'unit');
          view.setSelection([unit.id]); view.zoom = .9;
          return unit.id;
        }''')
        page.locator('#battlefield-canvas').focus()
        page.keyboard.press('Control+1')
        page.locator('#game-options').click()
        page.locator('#pause-save').click()
        page.locator('#save-name').fill('Training checkpoint')
        page.locator('#save-new').click()
        page.get_by_text('Game saved.', exact=True).wait_for()
        before = page.evaluate('JSON.stringify(window.ra2.game.captureSnapshot(), (k,v) => ArrayBuffer.isView(v) ? Array.from(v) : v)')
        page.screenshot(path=str(EVIDENCE / 'save-en.png'))
        with page.expect_download() as downloaded:
            page.locator('#save-export').click()
        backup = EVIDENCE / 'training.rustalarm-save'
        downloaded.value.save_as(backup)
        exported = json.loads(backup.read_text())
        assert exported['name'] == 'Training checkpoint'
        assert exported['format'] == 'rustalarm-save'

        # Closing and reopening the browser proves persistence beyond a page session.
        context.close()
        context = playwright.chromium.launch_persistent_context(profile, channel='chrome', headless=True,
            viewport={'width': 1280, 'height': 800}, accept_downloads=True, downloads_path=downloads)
        page = context.pages[0]
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('crash', lambda: print('Browser page crashed after restart', flush=True))
        page.goto(URL)
        page.wait_for_load_state('networkidle')
        page.get_by_test_id('mode-load').click()
        page.locator('[data-save-id]').first.click()
        page.locator('#save-load').click()
        page.locator('#resume').wait_for(timeout=60000)
        after = page.evaluate('JSON.stringify(window.ra2.game.captureSnapshot(), (k,v) => ArrayBuffer.isView(v) ? Array.from(v) : v)')
        assert json.loads(after) == json.loads(before)
        assert page.evaluate('window.ra2.game.paused')
        assert page.locator('#battlefield-canvas').get_attribute('data-renderer') == '2d'
        assert page.evaluate('[...window.ra2.renderer.selection]') == [selected_id]
        assert page.evaluate('window.ra2.renderer.camera') == exported['view']['camera']
        assert page.evaluate('window.ra2.renderer.zoom') == exported['view']['zoom']
        page.locator('#resume').click()
        page.wait_for_function('window.ra2.game.time > ' + str(exported['engine']['time']))
        assert not page.evaluate('window.ra2.game.paused')
        page.evaluate('() => window.ra2.renderer.setSelection([])')
        page.keyboard.press('1')
        assert page.evaluate('[...window.ra2.renderer.selection]') == [selected_id]
        print('PASS browser restart and exact restoration', flush=True)

        # A failed overwrite must retain the previous record after request rollback.
        page.locator('#game-options').click()
        page.locator('#pause-save').click()
        page.locator('[data-save-id]').first.click()
        page.locator('#save-name').fill('Failed overwrite')
        page.evaluate('''() => {
          window.savedPut = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function(...args) {
            const request = window.savedPut.apply(this, args);
            this.transaction.abort();
            return request;
          };
        }''')
        page.locator('#save-overwrite').click()
        page.locator('#save-confirm').click()
        page.get_by_text('The browser cannot access saves. Check site storage permissions.', exact=True).wait_for()
        page.evaluate('() => { IDBObjectStore.prototype.put = window.savedPut; }')
        stored = page.evaluate('''async () => {
          const database = await new Promise((resolve, reject) => {
            const request = indexedDB.open('rustalarm-saves', 1);
            request.onsuccess = () => resolve(request.result); request.onerror = reject;
          });
          const record = await new Promise((resolve, reject) => {
            const request = database.transaction('saves').objectStore('saves').getAll();
            request.onsuccess = () => resolve(request.result[0]); request.onerror = reject;
          });
          database.close();
          return JSON.stringify(record.data, (key, value) => ArrayBuffer.isView(value) ? Array.from(value) : value);
        }''')
        assert json.loads(stored) == exported

        # A committed overwrite changes only the selected slot.
        page.locator('#save-name').fill('Updated training')
        page.locator('#save-overwrite').click()
        page.locator('#save-cancel').click()
        assert page.locator('[data-save-id]').count() == 1
        page.locator('#save-overwrite').click()
        page.locator('#save-confirm').click()
        page.get_by_text('Game saved.', exact=True).wait_for()
        assert page.locator('[data-save-id]').count() == 1
        assert 'Updated training' in page.locator('[data-save-id]').inner_text()

        # Invalid files and newer formats leave the active game and save list intact.
        active_before = page.evaluate('JSON.stringify(window.ra2.game.captureSnapshot(), (k,v) => ArrayBuffer.isView(v) ? Array.from(v) : v)')
        page.locator('#save-file').set_input_files({'name': 'bad.rustalarm-save', 'mimeType': 'application/json', 'buffer': b'{bad'})
        page.get_by_text('The save contains invalid data.', exact=True).wait_for()
        newer = dict(exported, schemaVersion=99)
        page.locator('#save-file').set_input_files({'name': 'new.rustalarm-save', 'mimeType': 'application/json', 'buffer': json.dumps(newer).encode()})
        page.get_by_text('This save version is incompatible.', exact=True).wait_for()
        assert page.evaluate('JSON.stringify(window.ra2.game.captureSnapshot(), (k,v) => ArrayBuffer.isView(v) ? Array.from(v) : v)') == active_before
        assert page.locator('[data-save-id]').count() == 1
        page.locator('#save-file').set_input_files(backup)
        page.get_by_text('Save imported.', exact=True).wait_for()
        assert page.locator('[data-save-id]').count() == 2

        # Live language changes keep the selection and expose translated actions.
        page.locator('.modal-shade [data-language-control]').select_option('zh-CN')
        assert page.locator('#save-new').inner_text() == '新建存档'
        assert page.locator('#save-delete').inner_text() == '删除存档'
        assert page.locator('#save-status').inner_text() == '存档已导入。'
        page.set_viewport_size({'width': 760, 'height': 600})
        page.screenshot(path=str(EVIDENCE / 'save-zh.png'))
        assert page.locator('.save-dialog').evaluate('(el) => el.getBoundingClientRect().right <= innerWidth')
        page.locator('.modal-shade [data-language-control]').select_option('en')
        page.locator('#save-delete').click()
        page.locator('#save-cancel').click()
        assert page.locator('[data-save-id]').count() == 2
        page.locator('#save-delete').click()
        page.locator('#save-confirm').click()
        page.get_by_text('Save deleted.', exact=True).wait_for()
        assert page.locator('[data-save-id]').count() == 1
        page.locator('#saves-back').click()

        # A failed renderer construction restores the original live match.
        page.locator('#pause-load').click()
        page.locator('[data-save-id]').first.click()
        page.evaluate('window.originalGame = window.ra2.game')
        page.locator('#save-load').click()
        page.locator('#save-cancel').click()
        assert page.evaluate('window.ra2.game === window.originalGame')
        page.evaluate('''() => {
          window.savedGetContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(...args) {
            if (this.id === 'battlefield-canvas') throw new Error('Test renderer failure');
            return window.savedGetContext.apply(this, args);
          };
        }''')
        page.locator('#save-load').click()
        page.locator('#save-confirm').click()
        page.get_by_text('Test renderer failure', exact=True).wait_for()
        page.evaluate('() => { HTMLCanvasElement.prototype.getContext = window.savedGetContext; }')
        assert page.evaluate('window.ra2.game === window.originalGame')
        page.locator('#save-load').click()
        page.locator('#save-confirm').click()
        page.locator('#resume').wait_for()
        assert page.evaluate('window.ra2.game !== window.originalGame')
        page.locator('#resume').click()
        page.wait_for_function('!window.ra2.game.paused')

        # Both a native map and an imported map survive a new page session.
        for imported in [False, True]:
            page.goto(URL)
            page.get_by_test_id('mode-skirmish').click()
            page.locator('#start').wait_for(timeout=60000)
            page.locator('#music').uncheck()
            if imported:
                custom = {'format': 'ra2-web-map', 'version': 1, 'name': 'Saved custom map',
                    'width': 32, 'height': 32, 'theater': 'temperate', 'cells': ['land'] * 1024,
                    'spawns': [{'x': 7, 'y': 7}, {'x': 25, 'y': 25}]}
                page.locator('#lobby-map-file').set_input_files({'name': 'saved.ra2map', 'mimeType': 'application/json', 'buffer': json.dumps(custom).encode()})
                page.wait_for_function('window.ra2.map.name === "Saved custom map"')
            page.locator('#start').click()
            page.locator('#battlefield-canvas').wait_for()
            page.locator('[data-command=deploy]').click()
            page.locator('#game-options').click()
            page.locator('#pause-save').click()
            slot_name = 'Custom map checkpoint' if imported else 'Native map checkpoint'
            page.locator('#save-name').fill(slot_name)
            page.locator('#save-new').click()
            page.get_by_text('Game saved.', exact=True).wait_for()
            expected = page.evaluate('JSON.stringify(window.ra2.game.captureSnapshot(), (k,v) => ArrayBuffer.isView(v) ? Array.from(v) : v)')
            page.goto(URL)
            page.get_by_test_id('mode-load').click()
            page.locator('[data-save-id]').filter(has_text=slot_name).click()
            page.locator('#save-load').click()
            page.locator('#resume').wait_for(timeout=60000)
            actual = page.evaluate('JSON.stringify(window.ra2.game.captureSnapshot(), (k,v) => ArrayBuffer.isView(v) ? Array.from(v) : v)')
            assert json.loads(actual) == json.loads(expected)
            assert page.evaluate('window.ra2.game.mode') == 'skirmish'
            if imported:
                assert page.evaluate('window.ra2.map.name') == 'Saved custom map'
            page.screenshot(path=str(EVIDENCE / ('loaded-custom.png' if imported else 'loaded-native.png')))
            page.locator('#surrender').click()
            page.locator('#result-back').click()
            page.locator('#start').click()
            page.locator('#battlefield-canvas').wait_for()
        assert errors == [], errors
        print('PASS both modes, native/imported maps, browser restart, file import/export, overwrite rollback, deletion, locales and failed-load recovery')
    finally:
        context.close()
