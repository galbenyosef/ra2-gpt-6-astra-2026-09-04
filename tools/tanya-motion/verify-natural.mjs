// Real browser acceptance of six source poses, dense playback, pause and original-map pairing.
// Saves local inspection screenshots only; originals and screenshots never enter Git.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4180',out='.cache/natural-motion';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');await page.waitForFunction(()=>document.querySelector('#readout')?.textContent.includes('骨骼'));await page.selectOption('#action','swim');await page.selectOption('#facing','2');await page.click('#play');
 assert.ok(Number((await page.locator('#readout').innerText()).match(/([\d.]+) 秒/)[1])>=1.2,'swim must allow recovery and glide');
 for(let i=0;i<6;i++){await page.locator('#seek').fill(String(i));await page.locator('#seek').dispatchEvent('input');assert.match(await page.locator('#readout').innerText(),new RegExp(`SHP ${518+i}`));await page.screenshot({path:`${out}/swim-key-${i+1}.png`});}
 await page.selectOption('#action','walk');for(let i=0;i<6;i++){await page.locator('#seek').fill(String(i));await page.locator('#seek').dispatchEvent('input');await page.screenshot({path:`${out}/run-key-${i+1}.png`});}
 await page.goto(origin+'/canvas/');await page.waitForFunction(()=>window.__hd?.ready);
 assert.ok(await page.evaluate(()=>__hd.hd.sprites.tany.sourceFrames===619&&__hd.hd.sprites.tany.motionSequences.swim.count>6));
 await page.selectOption('#frame-action','swim');await page.selectOption('#frame-facing','2');
 for(let i=0;i<6;i++){await page.locator('#frame-step').fill(String(i));await page.locator('#frame-step').dispatchEvent('input');const pair=await page.evaluate(()=>{const h=__hd,e=h.actors[7],a=h.renderer.entityPresentation(e),b=h.renderer.entityPresentation(h.comparisons.find(p=>p.source.id===e.id).copy);return {a:a.frame,b:b.frame,hd:a.sprite.src!==b.sprite.src};});assert.deepEqual(pair,{a:518+i,b:518+i,hd:true});}
 await page.selectOption('#frame-action','all');assert.equal(await page.locator('#frame-step').getAttribute('max'),'618');await page.locator('#frame-step').fill('362');await page.locator('#frame-step').dispatchEvent('input');assert.match(await page.locator('#frame-readout').innerText(),/原版未命名/);
 await page.selectOption('#frame-action','auto');await page.click('#reset');await page.waitForFunction(()=>{const h=__hd,v=h.renderer.entityPresentation(h.actors[5]);return v?.action==='walk'&&v.frame>=619;});
 await page.click('#pause');const paused=await page.evaluate(()=>({time:__hd.game.time,frame:__hd.renderer.entityPresentation(__hd.actors[5]).frame}));await page.waitForTimeout(120);assert.deepEqual(await page.evaluate(()=>({time:__hd.game.time,frame:__hd.renderer.entityPresentation(__hd.actors[5]).frame})),paused);
 // Dense swim and original six-slot samples must share cycle phase on the same water route.
 for(const time of [.1,.45,.9,1.35,3,6,9,12,16.3,17,18,20.3]){
  await page.evaluate(t=>{__hd.game.time=t;},time);await page.waitForTimeout(40);
  const result=await page.evaluate(()=>{const h=__hd,e=h.demos.swim,v=h.renderer.entityPresentation(e),p=h.comparisons.find(p=>p.source.id===e.id),old=h.renderer.entityPresentation(p.copy);return {x:e.x,y:e.y,frame:v.frame,old:old.frame,action:v.action};});assert.ok(result.x>=16.6&&result.x<=20.4&&result.y>=11.49&&result.y<=12.21);assert.ok(result.frame>=0&&result.old<619);if(result.action==='swim')assert.ok(result.frame>=619);
 }
 await page.evaluate(()=>{const h=__hd;h.game.time=1.05;h.renderer.center(18.5,11.7);h.renderer.zoom=2;});await page.waitForTimeout(80);await page.screenshot({path:out+'/swim-original-map.png'});
 assert.deepEqual(errors,[]);console.log('Browser passed: six source poses, 619-slot fallback, distance-driven run, pause, swimming and same-map comparison.');
}finally{await browser.close();}
