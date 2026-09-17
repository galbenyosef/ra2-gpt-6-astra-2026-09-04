/** Regression for in-flight switches, input, exit cancellation and live language changes. */
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4207/';
const b=await chromium.connectOverCDP(process.env.RA2_CDP_URL||'http://127.0.0.1:9227'),p=b.contexts()[0].pages()[0];
const errors=[];p.on('pageerror',e=>errors.push(e.message));
async function enter(){await p.goto(url);await p.locator('[data-language-select]').selectOption('en');await p.getByTestId('mode-bootcamp').click();await p.locator('#start').waitFor({timeout:90000});await p.locator('#music').uncheck();await p.locator('#start').click();await p.locator('.debug-panel summary').click();await p.evaluate(()=>window.ra2.game.paused=true);}
async function hold(){await p.evaluate(()=>{window.savedFetch=window.fetch;window.fetch=(url,options)=>{if(String(url).includes('/app/models/')&&!window.releaseModel){window.loadSignal=options.signal;return new Promise(resolve=>{window.releaseModel=()=>resolve(window.savedFetch(url,options));});}return window.savedFetch(url,options);};});await p.getByTestId('renderer-3d').click();await p.waitForFunction(()=>!!window.releaseModel);}
try{
 await p.goto(url);await p.getByTestId('mode-assets').click();await p.locator('.asset-setup-screen').waitFor();
 await p.locator('.setup-mode-back').click();await p.getByTestId('mode-editor').click();
 await p.locator('[data-editor-canvas]').waitFor({timeout:90000});await p.locator('[data-action="back"]').click();
 await p.getByTestId('mode-back').click();assert.equal(await p.getByTestId('mode-screen').isVisible(),true,'asset preparation and editor retain routes back to the mode menu');
 await enter();await hold();
 assert.equal(await p.locator('#battlefield-canvas').getAttribute('data-renderer'),'2d');
 await p.locator('[data-category="infantry"]').click();const n=await p.evaluate(()=>window.ra2.game.entities.length);
 await p.locator('[data-build="conscript"]').click();assert.equal(await p.evaluate(()=>window.ra2.game.entities.length),n+1,'recruitment works while GLB fetch is held');
 await p.getByTestId('renderer-2d').click();await p.evaluate(()=>{window.releaseModel();window.fetch=window.savedFetch;});
 await p.waitForTimeout(1800);assert.equal(await p.locator('#battlefield-canvas').getAttribute('data-renderer'),'2d','late completion respects latest 2D request');
 await p.getByTestId('renderer-3d').click();await p.waitForFunction(()=>!!window.ra2.renderer.modelLayer);assert.equal(await p.evaluate(()=>window.ra2.game.entities.length),n+1);
 const old=await p.evaluate(()=>{window.previousGame=window.ra2.game;window.previousView=window.ra2.renderer;return window.previousGame.time;});
 await p.locator('#game-options').click();await p.locator('#leave').click();await p.waitForTimeout(200);
 assert.equal(await p.evaluate(()=>window.previousGame.time),old,'exit stops old simulation');
 await enter();await hold();await p.locator('#game-options').click();await p.locator('#leave').click();
 assert.equal(await p.evaluate(()=>window.loadSignal.aborted),true,'leaving aborts the pending model fetch');
 await p.evaluate(()=>{window.releaseModel();window.fetch=window.savedFetch;});
 await p.getByTestId('mode-bootcamp').click();await p.locator('#start').click();await p.locator('.debug-panel summary').click();
 assert.equal(await p.locator('#battlefield-canvas').getAttribute('data-renderer'),'2d','late old request cannot switch the new battle');
 await p.getByTestId('renderer-3d').click();await p.waitForFunction(()=>!!window.ra2.renderer.modelLayer);
 await p.locator('[data-language-select]').selectOption('zh-CN');
 assert.equal(await p.locator('.renderer-switch legend').innerText(),'渲染器','live Chinese switch localizes new controls');
 assert.match(await p.getByTestId('renderer-status').innerText(),/原版地形/,'live Chinese switch localizes render status');
 await p.locator('[data-language-select]').selectOption('en');assert.equal(await p.locator('.renderer-switch legend').innerText(),'Renderer');
 assert.deepEqual(errors,[]);console.log('PASS asset/editor entry, loading-time input, latest-mode intent, abort on exit, stale completion, live English/Chinese controls and no old simulation loop.');
}finally{await b.close();}
