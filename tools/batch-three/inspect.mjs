// Orthographic source/runtime views with an invariant fit and explicit camera axes.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'.cache/batch-three/orthographic');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:900}});
 await page.goto((process.env.RA2_BROWSER_URL||'http://127.0.0.1:4193')+'/@fs/'+root+'/tools/batch-three/inspector.html');
 await page.waitForFunction(()=>window.assetReview?.ready);
 for(const id of process.argv.slice(2)){
  if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid asset ID');
  const file=root+(id.startsWith('original-')?'/.cache/batch-three/source/':'/assets/hd/batch-three/')+id+'.glb';
  const metrics=await page.evaluate(url=>window.assetReview.load(url),'/@fs/'+file);
  for(const view of['front','rear','left','right','top','source']){
   await page.evaluate(v=>window.assetReview.view(v),view);
   await page.screenshot({path:out+'/'+id+'-'+view+'.png'});
  }
  await fs.writeFile(out+'/'+id+'.json',JSON.stringify({...metrics,cameras:'front = -X; rear = +X; left = +Z; right = -Z; top = +Y; source = (+X,+sqrt(2/3),-Z)',projection:'orthographic, same radius for every view'},null,2)+'\n');
 }
}finally{await browser.close();}
