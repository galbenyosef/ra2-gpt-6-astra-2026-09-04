/** Empty-category regression plus original-art menus and live settings acceptance.
 * Kept above 5KB as one browser flow retaining state across dialogs, resizing and 2D/3D.
 */
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4226/';
const out='.cache/sidebar/evidence';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const tick=()=>page.waitForTimeout(320);
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
const section=id=>page.locator(`[data-option-section=${id}]`).click();
async function enter(mode,country='america'){
  await page.goto(url);await page.getByTestId('mode-'+mode).click();
  await page.locator('#start').waitFor({timeout:60000});await page.locator('#music').uncheck();
  await page.locator('[data-slot="0"][data-key=country]').selectOption(country);
  await page.locator('#start').click();await tick();
}
try {
  for(const country of ['america','russia']){
    await enter('skirmish',country);
    assert.equal(await page.locator('#build-list').innerText(),'','No deployment/facility placeholder');
    for(const category of ['structure','defense','infantry','vehicle'])assert.equal(await page.locator(`[data-category=${category}]`).isDisabled(),true);
    await page.locator('[data-command=deploy]').click();await tick();
    assert.equal(await page.locator('[data-category=structure]').isEnabled(),true);
    assert.equal(await page.locator('[data-category=infantry]').isDisabled(),true);
    await page.keyboard.press('Tab');await tick();
    assert.equal(await page.locator('[data-category=infantry]').getAttribute('aria-pressed'),'false');
    // Producer appears/disappears while the category is selected: fall back without stale cards.
    await page.evaluate(country=>{const g=window.ra2.game,p=g.players[0];g.spawnEntity(country==='america'?'barracks':'soviet_barracks',0,p.spawn.x+6,p.spawn.y+6);},country);await tick();
    await page.locator('[data-category=infantry]').click();
    assert.ok(await page.locator('[data-build]').count()>0);
    await page.evaluate(()=>{for(const e of window.ra2.game.entities)if(e.owner===0&&e.type.includes('barracks'))e.hp=0;});await tick();
    assert.equal(await page.locator('[data-category=infantry]').isDisabled(),true);
    assert.equal(await page.locator('[data-category=structure]').getAttribute('aria-pressed'),'true');
    await shot(`empty-category-${country}`);
  }
  if(process.env.RA2_EMPTY_ONLY){console.log('PASS empty categories');process.exitCode=0;}
  else {
    for(const locale of ['en','zh-CN']){
      await page.goto(url);await page.locator('[data-language-control]').selectOption(locale);
      await page.locator('html[data-native-menu=true]').waitFor();
      assert.equal(await page.locator('.mode-options p').count(),0);
      assert.equal(await page.getByText('Build a base and defeat computer opponents.',{exact:true}).count(),0);
      await shot(`after-menu-${locale}`);
      await enter('bootcamp');
      assert.equal(await page.locator('[data-category=defense]').isDisabled(),true);
      await page.evaluate(()=>{window.menuTestGame=window.ra2.game;});
      for(const size of [{width:1280,height:800},{width:1024,height:600}]){
        await page.setViewportSize(size);await page.locator('#game-options').click();await shot(`after-pause-${locale}-${size.width}`);
        await page.locator('#pause-settings').click();
        await page.locator('#option-speed').selectOption('1.5');
        assert.equal(await page.evaluate(()=>window.ra2.game.speed),1.5);
        await page.locator('#screen-size').selectOption('1024x768');await tick();
        assert.ok(await page.locator('.game-screen').evaluate(el=>el.clientWidth<=1024));
        await shot(`after-options-${locale}-${size.width}`);
        await section('audio');await page.locator('#sound-volume').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
        await page.locator('#option-sound').uncheck();await page.locator('#option-music').check();
        await page.locator('#music-volume').focus();await page.keyboard.press('Home');
        const tracks=await page.locator('#music-track option').evaluateAll(es=>es.map(e=>e.value));
        if(tracks.length>1)await page.locator('#music-track').selectOption(tracks[1]);
        await page.locator('#option-music').uncheck();await shot(`after-audio-${locale}-${size.width}`);
        await section('controls');await page.locator('#edge-scroll').uncheck();
        await page.locator('#scroll-speed').focus();await page.keyboard.press('End');
        assert.equal(await page.evaluate(()=>window.ra2.renderer.edgeScroll),false);
        assert.equal(await page.evaluate(()=>window.ra2.renderer.scrollSpeed),2);
        assert.equal(await page.evaluate(()=>window.ra2.game.paused),true);
        await shot(`after-controls-${locale}-${size.width}`);
        await section('audio');assert.equal(await page.locator('#sound-volume').inputValue(),'1');
        assert.equal(await page.locator('#option-music').isChecked(),false);
        await section('display');await page.locator('#screen-size').selectOption('auto');
        await page.locator('#options-back').click();await page.locator('#resume').click();
        assert.equal(await page.evaluate(()=>window.ra2.game.paused),false);
      }
      await page.locator('.debug-panel summary').click();await page.getByTestId('renderer-3d').click();
      await page.waitForFunction(()=>document.querySelector('#battlefield-canvas').dataset.renderer==='3d');
      await page.locator('#game-options').click();await page.locator('#pause-settings').click();await shot(`after-options-3d-${locale}`);
      assert.equal(await page.evaluate(()=>window.ra2.game===window.menuTestGame),true);
      await page.keyboard.press('Escape');assert.equal(await page.locator('.modal').count(),0);
      assert.equal(await page.evaluate(()=>window.ra2.game.paused),false);
    }
    // Entry remains usable when originals have not been prepared yet.
    await page.route('**/assets/manifest.json',route=>route.fulfill({status:404,body:''}));
    await page.goto(url);assert.equal(await page.getByTestId('mode-skirmish').isVisible(),true);
    await shot('menu-unprepared');
    assert.deepEqual(errors,[]);console.log('PASS empty categories, locales, menu skins, audio/control/display settings, resizing and 3D');
  }
} finally {await browser.close();}
