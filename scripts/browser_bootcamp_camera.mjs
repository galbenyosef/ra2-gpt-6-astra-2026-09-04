/** Real camera/terrain acceptance: projection, pointer orders, placement and shared-state switches.
 * Uses the dedicated prepared browser; local visual evidence remains ignored.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.connectOverCDP(process.env.RA2_CDP_URL||'http://127.0.0.1:9227');
const page=browser.contexts()[0].pages()[0],url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4207/';
const output='.cache/bootcamp/camera';await fs.mkdir(output,{recursive:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const click=async(p,button='left')=>page.mouse.click(p.x,p.y,{button});
async function enter(){
 await page.goto(url);await page.locator('[data-language-select]').selectOption('en');await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:90000});
 assert.match(await page.locator('.map-info').innerText(),/Asset Training Field/);
 await page.locator('#music').uncheck();await page.locator('#start').click();await page.locator('.debug-panel summary').click();
 await page.evaluate(()=>{window.ra2.game.paused=true;window.ra2.renderer.edgeScroll=false;});
 assert.equal(await page.locator('#battlefield-canvas').getAttribute('data-renderer'),'2d');
 await page.getByTestId('renderer-3d').click();await page.waitForFunction(()=>!!window.ra2.renderer.modelLayer,{},{timeout:90000});
}
try{
 await enter();assert.equal(await page.getByTestId('camera-controls').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.ra2.renderer.modelLayer.environment.templates.size),9);
 await page.evaluate(()=>{const {game,renderer:r}=window.ra2;window.cameraGame=game;window.cameraMap=game.map;window.cameraEntities=[...game.entities];for(const e of game.entities){game.commandStop([e.id]);e.holdFire=true;}window.cameraSnapshot=JSON.stringify({entities:game.entities,players:game.players,time:game.time});});
 for(const preset of ['isometric','perspective','top']){
   await page.getByTestId('camera-preset').selectOption(preset);await page.getByTestId('camera-right').click();
   await page.getByTestId('renderer-2d').click();await page.getByTestId('renderer-3d').click();
   assert.ok(await page.evaluate(()=>{const {game}=window.ra2;return game===window.cameraGame&&game.map===window.cameraMap&&window.cameraEntities.every(e=>game.getEntity(e.id)===e)&&window.cameraSnapshot===JSON.stringify({entities:game.entities,players:game.players,time:game.time});}),'camera changes preserve exact game state');
 }
 await page.getByTestId('camera-reset').click();
 await page.evaluate(()=>{const r=window.ra2.renderer;r.center(22,18);r.zoom=.65;r.draw();});
 for(const preset of ['isometric','perspective','top']){
   await page.getByTestId('camera-preset').selectOption(preset);
   await page.screenshot({path:output+'/'+preset+'.png'});
 }
 await page.locator('.debug-panel summary').click();
 // Every camera preset, from four directions, must accept real canvas selection and movement.
 for(const preset of ['isometric','perspective','top']){
   await page.getByTestId('camera-preset').selectOption(preset);
   for(let direction=0;direction<4;direction++){
     const target=await page.evaluate(direction=>{
       const {game,renderer:r}=window.ra2;
       for(const unit of game.entities.filter(e=>e.kind==='unit')){game.commandStop([unit.id]);unit.x=['giant_squid','destroyer'].includes(unit.type)?44:4+unit.id%8;unit.y=unit.owner===0?2:37;}
       const e=game.entities.find(e=>e.owner===0&&e.type==='rhino');e.x=25;e.y=16;r.center(25,17);r.zoom=1.2;r.modelLayer.rig.yaw=Math.PI/4+direction*Math.PI/2;r.setSelection([]);r.draw();
       window.cameraTestUnit=e.id;const box=r.modelLayer.boxes.get(e.id),canvas=r.canvas.getBoundingClientRect();
       return{x:canvas.x+box.x+box.w/2,y:canvas.y+box.y+box.h/2};
     },direction);
     await click(target);assert.ok(await page.evaluate(()=>window.ra2.renderer.selection.has(window.cameraTestUnit)),`${preset}/${direction} ray selects actual Rhino`);
     const point=await page.evaluate(()=>{const r=window.ra2.renderer,p=r.toScreen(25,20),b=r.canvas.getBoundingClientRect();return{x:p.x+b.x,y:p.y+b.y};});
     await click(point,'right');
     assert.ok(await page.evaluate(()=>{
       const {game,renderer:r}=window.ra2,e=game.getEntity(window.cameraTestUnit),old={x:e.x,y:e.y};
       // The shared engine moves to the center of the clicked passable cell.
       if(e.order.kind!=='move'||e.order.x!==25.5||e.order.y!==20.5)return false;
       game.paused=false;game.step(.2);game.paused=true;r.draw();const model=r.modelLayer.models.get(e.id);model.group.updateMatrixWorld(true);const m=model.group.matrixWorld.elements,dx=e.x-old.x,dy=e.y-old.y;
       return Math.hypot(dx,dy)>0&&(-m[0]*dx-m[2]*dy)/Math.hypot(dx,dy)>.99;
     }),`${preset}/${direction} pointer order moves along actual model nose`);
   }
   console.log('PASS four camera directions: '+preset+' selection and real movement');
 }
 // Orbit gesture cannot accidentally select or issue an order.
 await page.getByTestId('camera-reset').click();
 const before=await page.evaluate(()=>({yaw:window.ra2.renderer.modelLayer.rig.yaw,entities:JSON.stringify(window.ra2.game.entities),selection:[...window.ra2.renderer.selection]}));
 const canvas=await page.locator('#battlefield-canvas').boundingBox();
 await page.keyboard.down('Alt');await page.mouse.move(canvas.x+450,canvas.y+300);await page.mouse.down();await page.mouse.move(canvas.x+600,canvas.y+350,{steps:8});await page.mouse.up();await page.keyboard.up('Alt');
 const after=await page.evaluate(()=>({yaw:window.ra2.renderer.modelLayer.rig.yaw,entities:JSON.stringify(window.ra2.game.entities),selection:[...window.ra2.renderer.selection]}));
 assert.notEqual(after.yaw,before.yaw);assert.equal(after.entities,before.entities);assert.deepEqual(after.selection,before.selection);
 const panBefore=await page.evaluate(()=>({...window.ra2.renderer.camera}));
 await page.mouse.move(canvas.x+450,canvas.y+400);await page.mouse.down({button:'middle'});await page.mouse.move(canvas.x+520,canvas.y+440,{steps:5});await page.mouse.up({button:'middle'});
 assert.notDeepEqual(await page.evaluate(()=>({...window.ra2.renderer.camera})),panBefore);
 const zoomPoint={x:canvas.x+550,y:canvas.y+430};await page.mouse.move(zoomPoint.x,zoomPoint.y);
 const anchor=await page.evaluate(()=>{const r=window.ra2.renderer,p=r.modelLayer.rig.ground(550,430,r);return{x:p.x,z:p.z};});
 await page.mouse.wheel(0,-100);await page.waitForTimeout(100);
 const anchored=await page.evaluate(()=>{const r=window.ra2.renderer,p=r.modelLayer.rig.ground(550,430,r);return{x:p.x,z:p.z};});
 assert.ok(Math.hypot(anchor.x-anchored.x,anchor.z-anchored.z)<1e-5,'zoom stays anchored to the ground point under the pointer');
 console.log('PASS Alt-orbit without commands, middle pan and pointer-anchored zoom');
 // Place a real building using the active projection in each preset.
 for(const preset of ['isometric','perspective','top']){
   await page.getByTestId('camera-preset').selectOption(preset);
   const point=await page.evaluate(()=>{const {game,renderer:r}=window.ra2;window.cameraBuildingCount=game.entities.filter(e=>e.type==='barracks').length;r.center(25,26);r.zoom=1;r.draw();const p=r.toScreen(25,26),b=r.canvas.getBoundingClientRect();return{x:p.x+b.x,y:p.y+b.y};});
   await page.locator('[data-category="structure"]').click();await page.locator('[data-build="barracks"]').click();await page.locator('[data-build="barracks"]').click();await click(point);
   assert.ok(await page.evaluate(()=>window.ra2.game.entities.filter(e=>e.type==='barracks').length===window.cameraBuildingCount+1),preset+' real building placement');
   await page.evaluate(()=>{const game=window.ra2.game,e=game.entities.findLast(e=>e.type==='barracks');game.sell(e.id);});
 }
 await page.locator('.debug-panel summary').click();
 const camera=await page.evaluate(()=>({yaw:window.ra2.renderer.modelLayer.rig.yaw,preset:window.ra2.renderer.modelLayer.rig.preset}));
 await page.getByTestId('renderer-2d').click();assert.equal(await page.getByTestId('camera-controls').isHidden(),true);
 await page.getByTestId('renderer-3d').click();assert.deepEqual(await page.evaluate(()=>({yaw:window.ra2.renderer.modelLayer.rig.yaw,preset:window.ra2.renderer.modelLayer.rig.preset})),camera);
 await page.locator('[data-language-select]').selectOption('zh-CN');assert.match(await page.getByTestId('camera-controls').innerText(),/重置视角/);
 assert.deepEqual(errors,[]);console.log('PASS placement in all presets, remembered view, live translation and zero browser errors');
 // Missing environment models use the same explicit 2D recovery as missing actors.
 await page.goto(url);await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:90000});await page.locator('#music').uncheck();await page.locator('#start').click();await page.locator('.debug-panel summary').click();
 // Intercept the application's fetch, including responses normally served by its service worker.
 await page.evaluate(()=>{window.originalFetch=window.fetch;window.fetch=(url,...args)=>String(url).includes('/grass-')?Promise.resolve(new Response('',{status:503})):window.originalFetch(url,...args);});
 await page.getByTestId('renderer-3d').click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="renderer-status"]')?.textContent.includes('失败'));
 assert.equal(await page.locator('#battlefield-canvas').getAttribute('data-renderer'),'2d');await page.evaluate(()=>window.fetch=window.originalFetch);
 console.log('PASS environment-load failure retains usable 2D');
}finally{await browser.close();}
