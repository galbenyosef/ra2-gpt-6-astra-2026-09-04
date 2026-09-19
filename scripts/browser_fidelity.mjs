/** Rust Alarm entry deadline, original controls, shared routes and visibility-safe tooltips.
 * One sequential browser fixture stays together (>5KB) to verify shared live state across 2D/3D. */
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4226/';
const out='.cache/sidebar/evidence';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
const tick=()=>page.waitForTimeout(300);
async function hoverEntity(type,owner=0) {
  const point=await page.evaluate(({type,owner})=>{
    const {game,renderer:r}=window.ra2;const entity=game.entities.find(e=>e.type===type&&e.owner===owner&&e.hp>0);
    if(!entity)throw Error('Missing '+type);r.center(entity.x,entity.y);r.draw();
    const p=r.toScreen(entity.x,entity.y),box=r.canvas.getBoundingClientRect();
    for(let dy=-60;dy<=10;dy+=5)for(let dx=-30;dx<=30;dx+=5)if(r.pick(p.x+dx,p.y+dy)?.id===entity.id)return {x:box.x+p.x+dx,y:box.y+p.y+dy,id:entity.id};
    throw Error('No pickable point for '+type);
  },{type,owner});
  await page.mouse.move(point.x,point.y);await page.waitForTimeout(350);
  assert.equal(await page.locator('.entity-tooltip').isVisible(),false,'name waits for the hover delay');
  await page.locator('.entity-tooltip').waitFor({state:'visible',timeout:1800});return point;
}
try {
  await page.addInitScript(()=>{
    let start;new MutationObserver(()=>{
      const splash=document.querySelector('.entry-splash');
      if(splash&&start===undefined)start=performance.now();
      if(!splash&&start!==undefined&&window.splashDuration===undefined)window.splashDuration=performance.now()-start;
    }).observe(document,{childList:true,subtree:true});
  });
  await page.goto(url);await page.locator('.entry-splash').waitFor();
  assert.equal(await page.title(),'Rust Alarm');
  assert.match(await page.locator('.entry-splash footer').innerText(),/© Victor Zhou 2026: Fan Remake.*Electronic Arts\./);
  await shot('rust-alarm-splash');await page.locator('.entry-splash').waitFor({state:'hidden',timeout:3300});
  assert.ok(await page.evaluate(()=>window.splashDuration<=3150));
  await page.locator('html[data-native-menu=true]').waitFor();await shot('rust-alarm-main-menu');
  await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:60000});
  const colors=await page.locator('[data-key=color]').evaluateAll(nodes=>nodes.map(n=>n.style.getPropertyValue('--player-color')));
  assert.deepEqual(colors,['#e6de0d','#ff1818','#2269d4','#3cd22d','#ffa018','#31d7e6','#9428bd','#ff99ea']);
  await page.locator('#music').uncheck();await page.locator('#start').click();await tick();
  assert.equal(await page.locator('.game-top').count(),0);assert.equal(await page.locator('[data-language-control]').count(),0);
  assert.equal(await page.locator('#command-bar button').count(),7);
  for(const size of [{width:1280,height:800},{width:1024,height:600}]) {
    await page.setViewportSize(size);await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>window.ra2.game.paused),true);
    const rail=await page.locator('.pause-shell .command-rail').boundingBox();assert.equal(Math.round(rail.x+rail.width),size.width);
    await page.locator('[data-language-control]').selectOption('zh-CN');assert.equal(await page.locator('#pause-settings').innerText(),'选项');
    await page.locator('[data-language-control]').selectOption('en');
    await shot(`rust-alarm-escape-${size.width}`);
    await page.locator('#pause-settings').click();await shot(`rust-alarm-options-${size.width}`);
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.ra2.game.paused),false);
  }
  await page.setViewportSize({width:1280,height:800});
  await page.evaluate(()=>{const {game,renderer}=window.ra2;renderer.edgeScroll=false;game.speed=0;window.testUnit=game.entities.find(e=>e.owner===0&&e.type==='rhino').id;renderer.setSelection([window.testUnit]);});
  await page.locator('[data-command=team1]').click({modifiers:['Meta']});
  await page.evaluate(()=>window.ra2.renderer.setSelection([]));await page.locator('[data-command=team1]').click();
  assert.deepEqual(await page.evaluate(()=>[...window.ra2.renderer.selection]),[await page.evaluate(()=>window.testUnit)]);
  await page.keyboard.press('Control+2');await page.evaluate(()=>window.ra2.renderer.setSelection([]));await page.keyboard.press('2');
  assert.equal(await page.evaluate(()=>window.ra2.renderer.selection.has(window.testUnit)),true);
  await page.locator('[data-command=waypoint]').click();
  assert.equal(await page.evaluate(()=>window.ra2.renderer.planningMode),true);
  const route=await page.evaluate(()=>{const {game,renderer:r}=window.ra2,e=game.getEntity(window.testUnit);r.center(e.x,e.y);const rect=r.canvas.getBoundingClientRect();
    return [{x:e.x+5,y:e.y},{x:e.x+5,y:e.y+5}].map(v=>{const p=r.toScreen(v.x,v.y);return {x:p.x+rect.x,y:p.y+rect.y};});});
  for(const p of route)await page.mouse.click(p.x,p.y,{button:'right'});
  assert.equal(await page.evaluate(()=>window.ra2.game.getEntity(window.testUnit).waypoints.length),1);
  await shot('rust-alarm-route');await page.locator('[data-command=stop]').click();
  assert.equal(await page.evaluate(()=>window.ra2.game.getEntity(window.testUnit).waypoints.length),0);
  await page.keyboard.press('z');assert.equal(await page.evaluate(()=>window.ra2.renderer.planningMode),false);
  for(const [type,name] of [['rhino','Rhino Tank'],['conscript','Conscript'],['construction_yard','Construction Yard']]) {
    const actual=await page.evaluate(type=>window.ra2.game.entities.find(e=>e.owner===0&&(e.type===type||e.type.includes(type)))?.type,type);
    await hoverEntity(actual);assert.match(await page.locator('.entity-tooltip').innerText(),new RegExp(name));await shot(`rust-alarm-tooltip-${type}`);
    await page.mouse.move(0,0);await page.locator('.entity-tooltip').waitFor({state:'hidden'});
  }
  const point=await hoverEntity('rhino');
  await page.evaluate(id=>{window.ra2.game.getEntity(id).hp=0;},point.id);await tick();assert.equal(await page.locator('.entity-tooltip').isVisible(),false,'destroyed unit loses tooltip');
  const enemy=await page.evaluate(()=>{const {game}=window.ra2;const p=game.players[1].spawn;return game.spawnEntity('rhino',1,p.x+6,p.y+6).id;});
  await hoverEntity('rhino',1);
  await page.evaluate(()=>{const g=window.ra2.game;g.fogOfWar=true;g.debugRevealMap=false;g.players[0].fog.fill(0);});await tick();
  assert.equal(await page.locator('.entity-tooltip').isVisible(),false,'fog cannot disclose an enemy name');
  await page.evaluate(()=>{window.ra2.game.fogOfWar=false;});
  await page.locator('.debug-panel summary').click();await page.getByTestId('renderer-3d').click();
  await page.waitForFunction(()=>document.querySelector('#battlefield-canvas').dataset.renderer==='3d');
  await hoverEntity('conscript');assert.equal(await page.locator('.entity-tooltip').innerText(),'Conscript');await shot('rust-alarm-tooltip-3d');
  assert.deepEqual(errors,[]);console.log('PASS splash deadline, title, native colors, ESC rail, groups, routes, 2D/3D hover and fog/death');
} finally {await browser.close();}
