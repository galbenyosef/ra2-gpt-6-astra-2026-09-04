/** Terrain acceptance: real harvesting, depleted/fogged resources and all camera presets/rotations.
 * Run on a dedicated prepared CDP browser. Screenshots and logs remain in ignored cache.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.connectOverCDP(process.env.RA2_CDP_URL||'http://127.0.0.1:9231');
const page=browser.contexts()[0].pages()[0],url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4211/';
const output='.cache/terrain/views';await fs.mkdir(output,{recursive:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.setViewportSize({width:1440,height:1000});await page.goto(url);await page.locator('[data-language-select]').selectOption('en');
 await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:90000});await page.locator('#music').uncheck();await page.locator('#start').click();
 await page.locator('.debug-panel summary').click();await page.evaluate(()=>{window.ra2.game.paused=true;window.ra2.renderer.edgeScroll=false;});
 await page.getByTestId('renderer-3d').click();await page.waitForFunction(()=>!!window.ra2.renderer.modelLayer,{},{timeout:90000});await page.locator('.debug-panel summary').click();
 await page.evaluate(()=>{const {game,renderer:r}=window.ra2;window.terrainSnapshot=JSON.stringify({map:game.map,ore:game.ore,entities:game.entities,players:game.players,time:game.time});window.terrainGame=game;window.terrainMap=game.map;window.terrainEntities=[...game.entities];
 window.terrainCount=index=>{const resource=r.modelLayer.environment.resources;let count=0;for(const {mesh,samples} of resource.batches)for(let i=0;i<samples.length;i++)if(samples[i].cell.index===index&&Math.hypot(...mesh.instanceMatrix.array.slice(i*16,i*16+3))>0)count++;return count;};});
 for(const preset of ['isometric','perspective','top']){
   await page.getByTestId('camera-preset').selectOption(preset);
   for(let rotation=0;rotation<4;rotation++){
     for(const [name,x,y,zoom] of [['field',22,20,.65],['road',23,19,2],['ore',17,26,2],['coast',31,21,2]]){
       await page.evaluate(({x,y,zoom,rotation})=>{const r=window.ra2.renderer;r.center(x,y);r.zoom=zoom;r.modelLayer.rig.yaw=Math.PI/4+rotation*Math.PI/2;r.draw();},{x,y,zoom,rotation});
       await page.screenshot({path:`${output}/${preset}-${rotation}-${name}.png`});
     }
   }
 }
 assert.ok(await page.evaluate(()=>{const {game}=window.ra2;return game===window.terrainGame&&game.map===window.terrainMap&&game.entities.every((e,i)=>e===window.terrainEntities[i])&&window.terrainSnapshot===JSON.stringify({map:game.map,ore:game.ore,entities:game.entities,players:game.players,time:game.time});}));
 console.log('PASS 48 near/far screenshots, three presets/four rotations, exact simulation identity/state');
 // Real shared-engine harvesting depletes a nearly empty cell and removes every corresponding mesh.
 const harvest=await page.evaluate(()=>{const {game,renderer:r}=window.ra2;const index=24*game.map.width+15;const full=window.terrainCount(index);
   const miner=game.entities.find(e=>e.owner===0&&e.type==='war_miner');if(!miner)throw Error('Missing training miner');
   miner.x=15;miner.y=24;miner.cargo=0;miner.order={kind:'harvest',x:15,y:24};miner.path=[];game.ore[index]=11;
   r.draw();const partial=window.terrainCount(index);game.paused=false;game.step(.2);game.paused=true;r.draw();
   return{full,partial,empty:window.terrainCount(index),remaining:game.ore[index],cargo:miner.cargo,soil:r.modelLayer.environment.surfaces.mask.image.data[index*4+3]};
 });
 assert.equal(harvest.full,48);assert.equal(harvest.partial,2);assert.equal(harvest.empty,0);assert.equal(harvest.remaining,0);assert.equal(harvest.cargo,11);assert.equal(harvest.soil,0);
 console.log('PASS real miner removes 11 remaining ore, receives cargo, and all depleted stone/soil disappears');
 const visibility=await page.evaluate(()=>{const {game,renderer:r}=window.ra2,index=25*game.map.width+16,original=game.visible;
   game.visible=()=>false;r.draw();const hidden=window.terrainCount(index),soil=r.modelLayer.environment.surfaces.mask.image.data[index*4+3];
   game.visible=original;r.draw();return{hidden,soil,restored:window.terrainCount(index)};});
 assert.deepEqual(visibility,{hidden:0,soil:0,restored:48});
 await page.locator('.debug-panel summary').click();
 const snapshot=await page.evaluate(()=>JSON.stringify({entities:window.ra2.game.entities,ore:window.ra2.game.ore,time:window.ra2.game.time}));
 await page.getByTestId('renderer-2d').click();await page.getByTestId('renderer-3d').click();
 assert.equal(await page.evaluate(()=>JSON.stringify({entities:window.ra2.game.entities,ore:window.ra2.game.ore,time:window.ra2.game.time})),snapshot);
 assert.ok(await page.evaluate(()=>{const {game,renderer:r}=window.ra2;return window.terrainCount(24*game.map.width+15)===0&&!r.modelLayer.environment.groundMeshes.some(m=>m.userData.environment==='ore-stones'||m.userData.environment==='shore-bank');}));
 assert.deepEqual(errors,[]);console.log('PASS visibility restoration, depleted roundtrip, original picking surface and zero JS/WebGL errors');
 // Regression: an imported map with no water must not create an empty shoreline batch.
 await page.goto(url);await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:90000});
 const land={format:'ra2-web-map',version:1,name:'Land-only terrain regression',width:24,height:24,theater:'temperate',spawns:[{x:5,y:5},{x:18,y:18}],cells:Array(24*24).fill('land')};
 await page.locator('#lobby-map-file').setInputFiles({name:'land.ra2map',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(land))});
 await page.locator('#music').uncheck();await page.locator('#start').click();await page.locator('.debug-panel summary').click();
 await page.evaluate(()=>{window.ra2.game.paused=true;});await page.getByTestId('renderer-3d').click();
 await page.waitForFunction(()=>document.querySelector('canvas[data-renderer]')?.dataset.renderer==='3d',{},{timeout:90000});
 assert.ok(await page.evaluate(()=>{const r=window.ra2.renderer;r.draw();return r.modelLayer.environment.groundMeshes.length>0&&!r.modelLayer.environment.batches.some(b=>b.mesh.userData.environment==='shore-bank');}));
 assert.deepEqual(errors,[]);await page.screenshot({path:output+'/land-only.png'});console.log('PASS uploaded land-only map renders in 3D without an empty shoreline buffer');
}finally{await browser.close();}
