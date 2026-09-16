// Local visual contact sheets of the delivered GLB and exact source slots.
// These contain original artwork and stay in the ignored cache.
import {chromium} from '@playwright/test';import fs from 'node:fs/promises';
const out='.cache/all-actions-review';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:800}});page.on('pageerror',e=>{throw e;});await page.goto((process.env.TEST_ORIGIN||'http://127.0.0.1:4181')+'/');await page.waitForFunction(()=>window.__motion);
 const sheets=await page.evaluate(async()=>{
  const names=[...document.querySelector('#action').options].map(o=>o.value),results=[];
  for(let start=0;start<names.length;start+=5){
   const c=document.createElement('canvas');c.width=1200;c.height=5*230;const x=c.getContext('2d');x.fillStyle='#20262c';x.fillRect(0,0,c.width,c.height);
   for(let row=0;row<5&&start+row<names.length;row++){
    const name=names[start+row],a=document.querySelector('#action');a.value=name;a.dispatchEvent(new Event('change'));
    if(['walk','swim','fireup','fireprone','tread','wetattack','ready','down','up','crawl','prone'].includes(name)){document.querySelector('#facing').value='2';document.querySelector('#facing').dispatchEvent(new Event('change'));}
    const seek=document.querySelector('#seek'),last=Number(seek.max),steps=[0,Math.floor(last/2),last];
    x.fillStyle='#e0e8f1';x.font='16px sans-serif';x.fillText(name,8,row*230+20);
    for(let j=0;j<3;j++){
     seek.value=steps[j];seek.dispatchEvent(new Event('input'));await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
     const h=window.__motion;h.renderer.render(h.group.parent,h.camera);
     x.drawImage(h.renderer.domElement,j*400,row*230+28,200,175);x.imageSmoothingEnabled=false;x.drawImage(document.querySelector('#reference'),j*400+200,row*230+28,200,175);x.imageSmoothingEnabled=true;
     x.fillStyle='#c9d6e2';x.font='12px sans-serif';x.fillText('HD / SHP · key '+steps[j],j*400+40,row*230+219);
    }
   }
   results.push(c.toDataURL().split(',')[1]);
  }
  return results;
 });
 for(let i=0;i<sheets.length;i++)await fs.writeFile(`${out}/contact-${i}.png`,Buffer.from(sheets[i],'base64'));
 console.log(`Saved ${sheets.length} GLB/source comparison sheets in ${out}`);
}finally{await browser.close();}
