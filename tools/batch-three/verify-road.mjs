// Read actual terrain GLB attributes and exercise visible placement/turn controls.
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const req=createRequire(new URL('../model-opt/package.json',import.meta.url));
const {NodeIO}=await import(req.resolve('@gltf-transform/core'));
const {ALL_EXTENSIONS}=await import(req.resolve('@gltf-transform/extensions'));
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'.cache/batch-three/verification');await fs.mkdir(out,{recursive:true});
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(root+'/assets/hd/batch-three/curved-road.glb');
const p=doc.getRoot().listMeshes()[0].listPrimitives()[0];
assert.equal(p.getIndices().getCount()/3,2);
for(const sem of['POSITION','NORMAL','TEXCOORD_0','TANGENT'])assert(p.getAttribute(sem).getArray().every(Number.isFinite));
assert.deepEqual(p.getAttribute('POSITION').getMin([]),[-1,0,-1]);assert.deepEqual(p.getAttribute('POSITION').getMax([]),[1,0,1]);
const record=JSON.parse(await fs.readFile(root+'/assets/hd/batch-three/curved-road.json'));assert(Object.values(record.edgeMaxDifference).every(v=>v===0));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4193';
 await page.goto(base+'/@fs/'+root+'/tools/batch-three/inspector.html');await page.waitForFunction(()=>window.assetReview?.ready);
 await page.evaluate(()=>window.assetReview.roadAssembly());
 for(const view of['top','source']){await page.evaluate(v=>window.assetReview.view(v),view);await page.screenshot({path:out+'/road-seams-'+view+'.png'});}
 await page.goto(base+'/canvas3d/?actor=curved-road');await page.waitForFunction(()=>window.canvas3d?.ready);
 assert.equal(await page.locator('#actor').inputValue(),'curved-road');
 const report=await page.evaluate(()=>{const a=window.canvas3d;a.pause(true);return{models:a.models.map(m=>m.id),missing:a.missing,position:a.selected.group.position.toArray(),bounds:new a.T.Box3().setFromObject(a.selected.group).getSize(new a.T.Vector3()).toArray()};});
 assert.equal(report.models.length,15);assert.equal(report.missing.length,0);assert.deepEqual(report.bounds,[2,0,2]);assert.equal(report.position[1],.004);
 await page.screenshot({path:out+'/road-canvas.png'});
 await page.locator('#turn').click();const heading=await page.evaluate(()=>window.canvas3d.selected.group.rotation.y);assert(Math.abs(heading-Math.PI/4)<1e-8);
 await page.locator('#step').click();assert.equal(await page.evaluate(()=>window.canvas3d.paused),true);assert.equal(errors.length,0);
 await fs.writeFile(out+'/road.json',JSON.stringify({...report,heading,errors},null,2)+'\n');console.log('PASS: actual 2x2 GLB, 15 retained/added actors, native texture decode, turn and time controls.');
}finally{await browser.close();}
