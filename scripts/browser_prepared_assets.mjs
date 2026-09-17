/** Regression: Bootcamp worktrees used to re-convert existing disk originals.
 * A fresh browser must enter both modes without an installer or conversion worker.
 */
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url = process.env.RA2_BROWSER_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({channel:'chrome', headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
const conversions = [], errors = [];
page.on('worker', worker => conversions.push(worker.url()));
page.on('pageerror', error => errors.push(error.message));
await context.route('**/*', route => {
  if (/archive\.org|pyodide|\/__local-installer\/file/.test(route.request().url())) {
    conversions.push(route.request().url()); return route.abort();
  }
  return route.continue();
});
try {
  await mkdir('.cache/bootcamp/evidence', {recursive:true});
  for (const mode of ['bootcamp', 'skirmish']) {
    await page.goto(url);
    await page.getByTestId('mode-' + mode).click();
    await page.locator('#start').waitFor({timeout:30000});
    await page.locator('#music').uncheck();
    await page.locator('#start').click();
    await page.locator('#battlefield-canvas').waitFor();
    if (mode === 'bootcamp') {
      await page.locator('.debug-panel summary').click();
      await page.getByTestId('renderer-3d').click();
      await page.waitForFunction(() => document.querySelector('canvas[data-renderer]')?.dataset.renderer === '3d', null, {timeout:30000});
      await page.getByTestId('renderer-2d').click();
      await page.waitForFunction(() => document.querySelector('canvas[data-renderer]')?.dataset.renderer === '2d');
    }
    await page.screenshot({path:`.cache/bootcamp/evidence/prepared-${mode}.png`});
    assert.deepEqual(conversions, [], 'No installer, runtime download, or conversion worker');
    assert.equal(await page.evaluate(async () => (await caches.keys()).some(key => /ra2-originals|ra2-download/.test(key))), false);
    console.log(`PASS fresh browser enters ${mode} using disk originals`);
  }
  assert.deepEqual(errors, []);
} finally {await browser.close();}
