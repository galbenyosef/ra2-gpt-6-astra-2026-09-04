/** Main-app movement/action regression on a locally uploaded map; tests observed model axes against actual displacement. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4207/';
const browser=await chromium.connectOverCDP(process.env.RA2_CDP_URL||'http://127.0.0.1:9227');
const page=browser.contexts()[0].pages()[0],out='.cache/bootcamp/evidence';
try {
 await page.goto(url);await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:90000});
 const map={format:'ra2-web-map',version:1,name:'Bootcamp motion verification',width:48,height:48,theater:'temperate',spawns:[{x:8,y:8},{x:8,y:40}],cells:Array.from({length:48*48},(_,i)=>i%48>=28?'water':'land')};
 await page.locator('#lobby-map-file').setInputFiles({name:'motion.ra2map',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(map))});
 await page.locator('#fog').uncheck();await page.locator('#music').uncheck();await page.locator('#start').click();await page.locator('.debug-panel summary').click();
 await page.evaluate(()=>{window.ra2.game.paused=true;window.ra2.renderer.edgeScroll=false;});
 await page.getByTestId('renderer-3d').click();await page.waitForFunction(()=>!!window.ra2?.renderer?.modelLayer);
 const report=await page.evaluate(()=>{
   const {game,renderer:r}=window.ra2,layer=r.modelLayer;
   const axes={tanya:[0,0,1],apocalypse:[-1,0,0],war_miner:[-1,0,0],rocketeer:[0,0,1],giant_squid:[0,0,-1],conscript:[0,0,1],rhino:[-1,0,0],destroyer:[-1,0,0]};
   const step=dt=>{game.paused=false;game.step(dt);game.paused=true;r.draw();};
   const headings=[],attacks=[],poses=[];
   const moveAside=()=>{for(const e of game.entities){game.commandStop([e.id]);e.holdFire=true;if(e.kind==='unit'){e.x=['giant_squid','destroyer'].includes(e.type)?44:3+e.id%15;e.y=e.owner===0?3:44;}}};
   for(const [type,axis] of Object.entries(axes)) {
     const e=game.entities.find(e=>e.owner===0&&e.type===type);
     for(let direction=0;direction<8;direction++) {
       moveAside();e.x=['giant_squid','destroyer'].includes(type)?35:19;e.y=22;
       const a=direction*Math.PI/4,start=[e.x,e.y];
       game.commandMove([e.id],e.x+Math.cos(a)*3,e.y+Math.sin(a)*3);step(.15);
       const m=layer.models.get(e.id);m.group.updateMatrixWorld(true);
       const elements=m.group.matrixWorld.elements;
       const nx=axis[0]*elements[0]+axis[2]*elements[8],nz=axis[0]*elements[2]+axis[2]*elements[10];
       const dx=e.x-start[0],dz=e.y-start[1],distance=Math.hypot(dx,dz),dot=(nx*dx+nz*dz)/distance;
       headings.push({type,direction,distance,dot});
     }
     // A stopped actor resumes with no model-only heading offset or stale pose.
     const m=layer.models.get(e.id);r.center(e.x,e.y);r.setSelection([e.id]);
     game.commandStop([e.id]);step(.15);const stopped=m.playing;
     game.commandMove([e.id],e.x-2,e.y);step(.2);poses.push({type,stopped,moving:m.playing,clip:!!m.action});
   }
   // A real command and weapon event drives attack clips, damage and target alignment.
   for(const type of ['rhino','tanya','rocketeer','destroyer','giant_squid']) {
     moveAside();const e=game.entities.find(e=>e.owner===0&&e.type===type),sea=['destroyer','giant_squid'].includes(type);
     e.x=sea?35:18;e.y=22;e.cooldown=0;
     const target=game.spawnEntity(sea?'destroyer':'apocalypse',1,e.x+(type==='giant_squid'?1:3),e.y);
     const hp=target.hp;game.commandAttack([e.id],target.id);step(.1);
     attacks.push({type,damage:hp-target.hp,clip:layer.models.get(e.id).playing,shot:game.time-e.lastShot,angle:e.angle,expected:Math.atan2(target.y-e.y,target.x-e.x)});
     target.hp=0;
   }
   // Skeletal vertices change during gameplay-driven travel, with finite positions.
   for(const type of ['tanya','conscript','rocketeer','giant_squid']) {
     moveAside();const e=game.entities.find(e=>e.owner===0&&e.type===type);e.x=type==='giant_squid'?35:18;e.y=22;
     game.commandMove([e.id],e.x+5,e.y);step(.01);
     const m=layer.models.get(e.id),meshes=[];m.root.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
     const sample=()=>{m.root.updateMatrixWorld(true);return meshes.flatMap(mesh=>{mesh.skeleton.update();const result=[];for(let i=0;i<mesh.geometry.attributes.position.count;i+=Math.max(1,Math.floor(mesh.geometry.attributes.position.count/50))){const v=mesh.position.clone();mesh.getVertexPosition(i,v);result.push(v.x,v.y,v.z);}return result;});};
     const a=sample();step(.17);const b=sample();poses.push({type,vertices:a.length,finite:b.every(Number.isFinite),deformation:Math.max(...a.map((v,i)=>Math.abs(v-b[i])))});
   }
   moveAside();const rhino=game.entities.find(e=>e.owner===0&&e.type==='rhino');rhino.x=18;rhino.y=22;const negativeStart=[rhino.x,rhino.y];game.commandMove([rhino.id],22,22);step(.1);
   const m=layer.models.get(rhino.id),saved=m.config.forwardAxis;m.config.forwardAxis=[0,0,1];r.draw();m.group.updateMatrixWorld(true);
   const bad=m.group.matrixWorld.elements,dx=rhino.x-negativeStart[0],dz=rhino.y-negativeStart[1],negative=(-bad[0]*dx-bad[2]*dz)/Math.hypot(dx,dz);m.config.forwardAxis=saved;r.draw();
   window.bootcampMotionStep=step;window.bootcampMoveAside=moveAside;
   return {headings,attacks,poses,negative};
 });
 for(const h of report.headings){assert.ok(h.distance>0,h.type+' actual motion');assert.ok(h.dot>.99,JSON.stringify(h));}
 assert.ok(Math.abs(report.negative)<.05,'wrong 90-degree mapping must fail');
 for(const a of report.attacks){assert.ok(a.damage>0,JSON.stringify(a));assert.ok(Math.abs(a.angle-a.expected)<.01);assert.ok(a.shot<.11);}
 assert.equal(report.poses.find(p=>p.type==='rocketeer').moving,'fly');
 for(const p of report.poses.filter(p=>p.vertices)){assert.ok(p.finite);assert.ok(p.deformation>1e-5,JSON.stringify(p));}
 await page.locator('.debug-panel summary').click();
 for(const type of ['rhino','destroyer','giant_squid','rocketeer','tanya']) {
   await page.evaluate(type=>{const {game,renderer:r}=window.ra2;window.bootcampMoveAside();const e=game.entities.find(e=>e.owner===0&&e.type===type);e.x=['giant_squid','destroyer'].includes(type)?35:18;e.y=22;r.center(e.x,e.y);r.zoom=1.5;r.setSelection([e.id]);game.commandMove([e.id],e.x+4,e.y);window.bootcampMotionStep(.1);},type);
   await page.screenshot({path:`${out}/motion-${type}.png`});
 }
 // A real right-click attack in each presentation, using a clearly separated visible enemy.
 for(const mode of ['2d','3d']) {
   await page.locator('.debug-panel summary').click();await page.getByTestId('renderer-'+mode).click();await page.locator('.debug-panel summary').click();
   const positions=await page.evaluate(()=>{
     const {game,renderer:r}=window.ra2;window.bootcampMoveAside();const e=game.entities.find(e=>e.owner===0&&e.type==='rhino');e.x=18;e.y=22;e.cooldown=0;
     const target=game.spawnEntity('rhino',1,21,22);r.center(19.5,22);r.setSelection([e.id]);r.draw();
     const b=r.canvas.getBoundingClientRect(),p=r.toScreen(target.x,target.y);
     if(r.modelLayer){const box=r.modelLayer.boxes.get(target.id);p.x=box.x+box.w/2;p.y=box.y+box.h/2;}else p.y-=5;
     window.attackEvidence={id:e.id,targetId:target.id,hp:target.hp};return{x:b.x+p.x,y:b.y+p.y};
   });
   await page.mouse.click(positions.x,positions.y,{button:'right'});
   assert.ok(await page.evaluate(()=>{const {game}=window.ra2,a=window.attackEvidence,e=game.getEntity(a.id);window.bootcampMotionStep(.1);return e.order.kind==='attack'&&e.order.targetId===a.targetId&&game.getEntity(a.targetId).hp<a.hp;}),mode+' UI attack damages actual enemy');
   await page.screenshot({path:`${out}/attack-${mode}.png`});
 }
 await fs.writeFile(out+'/motion-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({headingCases:report.headings.length,attacks:report.attacks,poses:report.poses,negativeControl:report.negative}));
}finally{await browser.close();}
