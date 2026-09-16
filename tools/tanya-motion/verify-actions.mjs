// Real-browser acceptance of all named action slots and the same-map automatic tour.
// Source-containing screenshots remain local, never in Git.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4181',out='.cache/all-actions-review';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');await page.waitForFunction(()=>window.__motion);
 await page.selectOption('#action','idle2');await page.locator('#seek').fill('7');await page.locator('#seek').dispatchEvent('input');await page.screenshot({path:out+'/throw.png'});
 await page.selectOption('#action','wetattack');assert.deepEqual(await page.evaluate(()=>['Left','Right'].map(s=>__motion.gltf.scene.getObjectByName('Tanya'+s+'Pistol').scale.x)),[0,1]);
 await page.selectOption('#action','swim');assert.deepEqual(await page.evaluate(()=>['Left','Right'].map(s=>__motion.gltf.scene.getObjectByName('Tanya'+s+'Pistol').scale.x)),[0,0]);
 await page.goto(origin+'/canvas/');await page.waitForFunction(()=>window.__hd?.ready);await page.click('#pause');
 const checked=await page.evaluate(()=>{
  const h=__hd,select=document.querySelector('#frame-action'),facing=document.querySelector('#frame-facing'),slider=document.querySelector('#frame-step'),catalog=h.hd.sprites.tany,seen=new Set(),failures=[];
  for(const option of [...select.options].filter(o=>!['auto','all'].includes(o.value))){select.value=option.value;select.dispatchEvent(new Event('change'));const [start,count,stride]=catalog.sequences[option.value];for(let dir=0;dir<(stride?8:1);dir++)for(let f=0;f<count;f++){
   facing.value=String(dir);facing.dispatchEvent(new Event('change'));slider.value=String(f);slider.dispatchEvent(new Event('input'));const e=h.actors[7],copy=h.comparisons.find(p=>p.source.id===e.id).copy,a=h.renderer.entityPresentation(e),b=h.renderer.entityPresentation(copy),index=start+dir*stride+f;seen.add(index);
   if(a.frame!==index||b.frame!==index||a.sprite.src===b.sprite.src)failures.push(`${option.value}/${dir}/${f}: source mismatch`);
   const[x,y,w,hh]=catalog.frameRects[index];if(!(w>1&&hh>1)&&!(option.value.startsWith('wetdie')&&f>=16))failures.push(`${option.value}/${dir}/${f}: blank HD`);
   if(x<0||y<0||x+w>catalog.width||y+hh>catalog.height)failures.push(`${option.value}/${dir}/${f}: atlas overflow`);
  }}return{frames:seen.size,failures,atlas:[catalog.width,catalog.height],total:catalog.frames};
 });assert.equal(checked.frames,515);assert.deepEqual(checked.failures,[]);
 for(const [name,frame]of [['swim',3],['wetattack',0],['walk',2],['idle2',7],['fireprone',1],['wetidle2',7],['die2',4]]){await page.selectOption('#frame-action',name);await page.selectOption('#frame-facing','2');await page.locator('#frame-step').fill(String(frame));await page.locator('#frame-step').dispatchEvent('input');await page.screenshot({path:`${out}/map-${name}.png`});}
 const remap=await page.evaluate(()=>{
  const h=__hd,s=h.hd.sprites.tany,r=h.renderer,im=h.assets.images.get(s.remapMaskSrc),c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const mask=x.getImageData(0,0,c.width,c.height).data;
  function pixels(color){x.clearRect(0,0,c.width,c.height);x.drawImage(r.coloredSprite(s,color),0,0);return x.getImageData(0,0,c.width,c.height).data;}const a=pixels('#ef303f'),b=pixels('#286ce5');let changed=0,outside=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]){changed++;if(mask[i+3]===0)outside++;}return{changed,outside};
 });assert.equal(remap.outside,0);assert.ok(remap.changed>20000);
 await page.click('#frame-tour');const tour=await page.evaluate(()=>{const h=__hd,names=[];for(let i=0;i<22;i++){h.inspector.update(1000+i*10);names.push(document.querySelector('#frame-action').value);}return names;});assert.equal(new Set(tour).size,21,'tour must reach every distinct action');assert.equal(tour[0],tour[21],'tour must loop');
 await page.locator('#frame-step').fill('0');await page.locator('#frame-step').dispatchEvent('input');assert.equal(await page.locator('#frame-tour').innerText(),'轮播全部动作');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checked,remap,tourActions:21,errors},null,2));
}finally{await browser.close();}
