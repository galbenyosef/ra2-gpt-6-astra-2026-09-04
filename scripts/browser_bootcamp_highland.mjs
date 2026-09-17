/** Regression: repeated tall cliff fragments and black gaps replaced by a continuous raised top.
 * Tests actual grass pixels and exposed faces, plus shared state across 2D/3D. Use a dedicated prepared profile.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4216/';
const profile=process.env.RA2_BROWSER_PROFILE;
assert.ok(profile,'Set RA2_BROWSER_PROFILE to a dedicated profile with originals prepared for this origin.');
const out=process.env.RA2_EVIDENCE_DIR||'.cache/bootcamp/highland';
await fs.mkdir(out,{recursive:true});
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 // Development-only negative control restores the old renderer path in this browser, never on disk.
 if(process.env.RA2_HIGHLAND_BASELINE==='1')await page.route('**/src/bootcamp/native-highland.ts*',async route=>{
  const response=await route.fetch(),body=await response.text();
  assert.ok(body.includes('export function drawTrainingHighland('),'negative control requires a Vite development server');
  await route.fulfill({response,body:body.replace('export function drawTrainingHighland(','function disabledDrawTrainingHighland(')+'\nexport function drawTrainingHighland(){return false;}\n'});
 });
 await page.goto(url);await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:90000});
 await page.locator('#music').uncheck();await page.locator('#start').click();await page.locator('#battlefield-canvas').waitFor();
 await page.evaluate(()=>{const {game:g,renderer:r}=window.ra2;g.paused=true;g.debugRevealMap=true;r.edgeScroll=false;window.beforeHighland={game:g,map:g.map,entities:[...g.entities],state:JSON.stringify({map:g.map,entities:g.entities,players:g.players,time:g.time,ore:g.ore})};});
 const results=[];
 for(const [zoom,cx,cy] of [[1,5,7],[2.5,5,7],[2.5,6,8]]){
  const result=await page.evaluate(({zoom,cx,cy})=>{
   const r=window.ra2.renderer;r.zoom=zoom;r.center(cx,cy);r.draw();
   const reference=document.createElement('canvas');reference.width=r.canvas.width;reference.height=r.canvas.height;
   const c=reference.getContext('2d');c.imageSmoothingEnabled=false;c.translate(r.width/2,r.height/2);c.scale(r.zoom,r.zoom);c.translate(-r.camera.x,-r.camera.y);
   const sprite=r.assets.terrain['temperate:0:0'],im=r.assets.images.get(sprite.src);
   const samples=[];
   for(const [x,y] of [[4,6],[5,7],[4,8]]){
    const p=r.project(x,y);c.drawImage(im,sprite.x,sprite.y,sprite.width,sprite.height,p.x-30,p.y-30,60,30);
    const s=r.toScreen(x,y),left=Math.round(s.x)-3,top=Math.round(s.y)-3;
    const actual=r.ctx.getImageData(left,top,6,6).data,expected=c.getImageData(left-1,top-1,8,8).data;
    // Allow one screen pixel of nearest-neighbor rounding at fractional zooms.
    let same=0;for(let i=0;i<actual.length;i+=4){let match=false;const px=i/4%6,py=Math.floor(i/24);
     for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){const j=((py+dy)*8+px+dx)*4;if(Math.abs(actual[i]-expected[j])+Math.abs(actual[i+1]-expected[j+1])+Math.abs(actual[i+2]-expected[j+2])<6)match=true;}
     if(match)same++;
    }
    samples.push({x,y,grassMatch:same/36});
   }
   let background=0,total=0;
   // Sample the interiors of both exposed front walls at half the one-level height.
   for(const [x,y] of [[6.5,6],[6.5,7],[6.5,8],[4,9.5],[5,9.5]]){
    const p=r.toScreen(x,y,false),data=r.ctx.getImageData(Math.round(p.x)-1,Math.round(p.y-7.5*zoom)-1,3,3).data;
    for(let i=0;i<data.length;i+=4){total++;if(data[i]===6&&data[i+1]===11&&data[i+2]===11)background++;}
   }
   return {zoom,cx,cy,samples,background,total};
  },{zoom,cx,cy});
  results.push(result);await page.screenshot({path:`${out}/top-${zoom}-${cx}-${cy}.png`});
  assert.ok(result.samples.every(s=>s.grassMatch>.95),`flat interior must match original grass: ${JSON.stringify(result)}`);
  assert.equal(result.background,0,'front walls must cover the background');
 }
 await page.locator('.debug-panel summary').click();
 for(let i=0;i<2;i++)for(const mode of ['3d','2d']){
  await page.getByTestId('renderer-'+mode).click();await page.waitForFunction(mode=>document.querySelector('canvas[data-renderer]')?.dataset.renderer===mode,mode,{timeout:90000});
  assert.ok(await page.evaluate(()=>{const {game:g}=window.ra2,b=window.beforeHighland;return g===b.game&&g.map===b.map&&g.entities.every((e,i)=>e===b.entities[i])&&b.state===JSON.stringify({map:g.map,entities:g.entities,players:g.players,time:g.time,ore:g.ore});}),'rendering leaves exact shared state and references intact');
 }
 assert.equal(errors.length,0,errors.join('\n'));
 await fs.writeFile(`${out}/results.json`,JSON.stringify({url,results,errors},null,2));console.log('PASS: flat native tops, filled front faces at two zooms and after pan, exact shared-state roundtrips');
}finally{await context.close();}
