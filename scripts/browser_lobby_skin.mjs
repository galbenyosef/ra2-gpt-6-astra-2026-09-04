/** Original lobby/map selector acceptance: preserve configurations across filtering and resizing. */
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4226/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:`.cache/sidebar/evidence/${name}.png`});
try {
  for(const locale of ['en','zh-CN'])for(const mode of ['skirmish','bootcamp']){
    await page.goto(url);await page.locator('[data-language-control]').selectOption(locale);
    await page.getByTestId('mode-'+mode).click();await page.locator('#start').waitFor({timeout:60000});
    await page.locator('[data-slot="0"][data-key=country]').selectOption('russia');
    await page.locator('[data-slot="0"][data-key=color]').selectOption('4');
    await page.locator('[data-slot="0"][data-key=team]').selectOption('1');
    for(const size of [{width:1280,height:800},{width:1024,height:600}]){
      await page.setViewportSize(size);await shot(`lobby-${mode}-${locale}-${size.width}`);
      const geometry=await page.evaluate(()=>({table:document.querySelector('.settings-panel').getBoundingClientRect().right,rail:document.querySelector('.lobby-rail').getBoundingClientRect().left,start:document.querySelector('#start').getBoundingClientRect().bottom}));
      assert.ok(geometry.table<geometry.rail);assert.ok(geometry.start<=size.height);
      await page.locator('#choose-map').click();await shot(`map-picker-${mode}-${locale}-${size.width}`);
      await page.locator('[data-map-filter=training]').click();
      assert.equal(await page.locator('[data-map-id]').count(),1);
      await page.locator('[data-map-id]').click();await page.locator('#map-confirm').waitFor();
      await page.locator('[data-map-filter=all]').click();
      await page.locator('#map-search').fill('zzz-no-such-map');assert.equal(await page.locator('[data-map-id]').count(),0);
      await page.locator('#map-search').fill('');await page.locator('#map-sort').selectOption('players');
      const counts=await page.locator('[data-map-id] span:last-child').allTextContents();
      assert.deepEqual(counts.map(Number),counts.map(Number).sort((a,b)=>a-b));
      await page.locator('#map-cancel').click();
      assert.equal(await page.locator('[data-slot="0"][data-key=country]').inputValue(),'russia');
      assert.equal(await page.locator('[data-slot="0"][data-key=color]').inputValue(),'4');
      assert.equal(await page.locator('[data-slot="0"][data-key=team]').inputValue(),'1');
    }
    await page.locator('#choose-map').click();await page.locator('[data-map-filter=training]').click();await page.locator('[data-map-id]').click();
    await page.waitForFunction(()=>!document.querySelector('#map-confirm').disabled);await page.locator('#map-confirm').click();
    assert.equal(await page.locator('#map-preview').getAttribute('aria-label'),locale==='en'?'Asset Training Field':'素材训练场');
    await page.locator('#music').uncheck();await page.locator('#start').click();await page.locator('#battlefield-canvas').waitFor();
    assert.equal(await page.evaluate(()=>window.ra2.map.id),'bootcamp-field');
    assert.equal(await page.evaluate(()=>window.ra2.game.players[0].country),'russia');
    console.log('PASS',mode,locale,'native lobby, map filters/sort/cancel/confirm and start');
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
