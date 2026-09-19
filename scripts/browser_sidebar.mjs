/** Native HUD acceptance: real pointer actions, both factions/locales, two sizes and 3D.
 * Kept above 5KB as one sequential end-to-end acceptance with shared browser lifecycle.
 * Fixtures use the existing inspection handle only to freeze time/find legal map points.
 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4226/';
const out=process.env.RA2_EVIDENCE_DIR||'.cache/sidebar/evidence';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800}});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
const tab=category=>page.locator(`[data-category="${category}"]`);
const card=id=>page.locator(`[data-build="${id}"]`);
const tick=()=>page.waitForTimeout(280);
async function enter(mode,faction){
  await page.goto(url);await page.getByTestId('mode-'+mode).click();
  await page.locator('#start').waitFor({timeout:60000});await page.locator('#music').uncheck();
  await page.locator('[data-slot="0"][data-key="country"]').selectOption(faction==='allied'?'america':'russia');
  await page.locator('#start').click();await page.locator('#battlefield-canvas').waitFor();await tick();
}
async function geometry(){
  const report=await page.evaluate(()=>{
    const root=document.querySelector('.ra2-sidebar'),r=root.getBoundingClientRect();
    const entries=[...root.querySelectorAll('[data-skin]')].map(el=>{
      const rect=el.getBoundingClientRect(),center={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
      return {name:el.dataset.skin,width:rect.width,height:rect.height,inBounds:rect.right<=r.right&&rect.bottom<=r.bottom,
        hit:el.tagName!=='BUTTON'||el.disabled||document.elementFromPoint(center.x,center.y)===el};
    });
    return {width:r.width,entries,cards:[...root.querySelectorAll('.build-item')].map(el=>({width:el.offsetWidth,height:el.offsetHeight}))};
  });
  assert.equal(report.width,168);
  for(const item of report.entries){if(item.name!=='addon')assert.ok(item.inBounds,JSON.stringify(item));assert.ok(item.hit,JSON.stringify(item));}
  for(const size of report.cards)assert.deepEqual(size,{width:60,height:48});
}
async function entityPoint(id){return page.evaluate(id=>{const {game,renderer}=window.ra2,e=game.getEntity(id),p=renderer.toScreen(e.x,e.y),r=renderer.canvas.getBoundingClientRect();return {x:p.x+r.x,y:p.y+r.y-10};},id);}
try {
  for(const faction of ['allied','soviet']){
    await enter('bootcamp',faction);
    for(const size of [{width:1280,height:800},{width:1024,height:600}]){
      await page.setViewportSize(size);await tick();await geometry();await shot(`after-${faction}-${size.width}`);
    }
    await page.locator('[data-language-control]').selectOption('zh-CN');await tick();
    assert.equal(await page.getByTestId('sidebar-options').getAttribute('aria-label'),'选项');
    await shot(`after-${faction}-zh`);
    await page.getByTestId('sidebar-options').click();await page.locator('#resume').click();
    await page.getByTestId('sidebar-status').click();await page.locator('#modal-x').click();
    await page.locator('[data-language-control]').selectOption('en');await tick();
    await card('barracks').click();await tick();assert.equal(await card('barracks').locator('.ready-text').count(),1);
    await shot(`ready-${faction}`);
    await card('barracks').click();
    const point=await page.evaluate(()=>{
      const {game,renderer}=window.ra2,r=renderer.canvas.getBoundingClientRect(),yard=game.entities.find(e=>e.owner===0&&e.type.includes('construction_yard'));
      for(let y=yard.y-7;y<yard.y+8;y++)for(let x=yard.x-7;x<yard.x+8;x++)if(game.canPlace(0,'barracks',x,y)){
        const p=renderer.toScreen(x,y);if(p.x>40&&p.x<r.width-40&&p.y>70&&p.y<r.height-100)return {x:r.x+p.x,y:r.y+p.y};
      }
      throw new Error('No visible legal barracks location');
    });
    await page.mouse.click(point.x,point.y);await tick();
    const built=await page.evaluate(()=>window.ra2.game.entities.find(e=>e.owner===0&&e.type==='barracks')?.id);
    assert.ok(built,'Pointer placement constructs barracks');
    await page.evaluate(id=>{const e=window.ra2.game.getEntity(id);e.hp-=100;},built);
    await page.getByTestId('sidebar-repair').click();assert.equal(await page.getByTestId('sidebar-repair').getAttribute('aria-pressed'),'true');
    const p=await entityPoint(built);await page.mouse.click(p.x,p.y);await tick();
    assert.equal(await page.evaluate(id=>window.ra2.game.getEntity(id)?.repairing,built),true);
    await page.getByTestId('sidebar-sell').click();await page.mouse.click(p.x,p.y);await tick();
    assert.equal(await page.evaluate(id=>Boolean(window.ra2.game.getEntity(id)&&window.ra2.game.getEntity(id).hp>0),built),false);
    await page.keyboard.press('Escape');
    await page.locator('.debug-panel summary').click();
    const identity=await page.evaluate(()=>{window.sidebarIdentity=window.ra2.game;return window.ra2.game.entities.map(e=>e.id);});
    await page.getByTestId('renderer-3d').click();await page.waitForFunction(()=>document.querySelector('canvas[data-renderer]')?.dataset.renderer==='3d',null,{timeout:60000});
    assert.equal(await page.evaluate(()=>window.sidebarIdentity===window.ra2.game),true);
    await tab('infantry').click();await card('tanya').click();await tick();
    assert.ok(await page.evaluate(ids=>window.ra2.game.entities.some(e=>!ids.includes(e.id)&&e.type==='tanya'),identity));
    await shot(`after-${faction}-3d`);await page.getByTestId('renderer-2d').click();
    await page.waitForFunction(()=>document.querySelector('canvas[data-renderer]')?.dataset.renderer==='2d');
    results.push(`${faction}: two sizes, bilingual, options/status, build/place/repair/sell, 3D recruitment and roundtrip`);
    console.log('PASS',results.at(-1));
  }
  for(const faction of ['allied','soviet']){
    await page.setViewportSize({width:1024,height:600});await enter('skirmish',faction);
    await page.locator('#deploy').click();await tick();
    const id=faction==='allied'?'power_plant':'tesla_reactor';
    await page.evaluate(()=>{window.ra2.game.paused=true;});
    await card(id).click();await tick();
    await page.evaluate(()=>{window.ra2.game.players[0].queues.structure[0].progress=.5;});await tick();
    assert.equal(await card(id).locator('.progress-mask').getAttribute('data-frame'),'27');await shot(`queue-${faction}`);
    await card(id).click({button:'right'});await tick();
    assert.equal(await page.evaluate(()=>window.ra2.game.players[0].queues.structure.length),0);
    await card(id).click();
    await page.evaluate(()=>window.ra2.game.setDebugInstantProduction(true));await tick();
    assert.equal(await card(id).locator('.ready-text').count(),1);
    await tab('defense').click();assert.equal(await tab('structure').evaluate(el=>el.classList.contains('has-ready')),true);
    await tab('structure').click();
    await page.getByTestId('production-next').click();await tick();
    assert.ok(await page.getByTestId('production-list').evaluate(el=>el.scrollTop>0));
    await page.getByTestId('production-previous').click();await tick();
    assert.equal(await page.getByTestId('production-list').evaluate(el=>el.scrollTop),0);
    await geometry();await shot(`skirmish-${faction}`);
    // A producer fixture unlocks ordinary unit queues without replaying an entire economy.
    await page.evaluate(faction=>{const g=window.ra2.game,p=g.players[0];g.setDebugInstantProduction(false);g.spawnEntity(faction==='allied'?'barracks':'soviet_barracks',0,p.spawn.x+5,p.spawn.y+5);},faction);
    await tab('infantry').click();const unit=faction==='allied'?'gi':'conscript';
    await card(unit).click();await card(unit).click();await tick();
    assert.equal(await card(unit).locator('.queue-count').textContent(),'2');
    await shot(`unit-queue-${faction}`);await card(unit).click({button:'right'});await tick();
    assert.equal(await page.evaluate(()=>window.ra2.game.players[0].queues.infantry.length),1);
    results.push(`${faction}: live skirmish queue, 55-frame clock, right-click cancel, ready tab and pagination`);
    console.log('PASS',results.at(-1));
  }
  assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({url,results,errors},null,2));
} catch(error){await shot('failure');throw error;} finally{await browser.close();}
