/** Real main-app acceptance: bilingual entry, shared-state switches, production, failure and cleanup.
 * Use a dedicated Chrome CDP profile with browser-private originals already prepared. Evidence stays ignored.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4207/';
const browser=await chromium.connectOverCDP(process.env.RA2_CDP_URL||'http://127.0.0.1:9227');
const page=browser.contexts()[0].pages()[0],evidence='.cache/bootcamp/evidence';
await fs.mkdir(evidence,{recursive:true});await page.setViewportSize({width:1440,height:1000});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(name,value)=>{assert.ok(value,name);console.log('PASS',name);};
const shot=name=>page.screenshot({path:`${evidence}/${name}.png`});
async function mode(value){await page.getByTestId(`renderer-${value}`).click();await page.waitForFunction(v=>document.querySelector('canvas[data-renderer]')?.dataset.renderer===v,value);}
async function enter(language='en'){
 await page.goto(url);await page.getByTestId('mode-bootcamp').waitFor();
 await page.locator('[data-language-select]').selectOption(language);
 await shot('home-'+language);await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:90000});
 await page.locator('#music').uncheck();await page.locator('#start').click();await page.locator('#battlefield-canvas').waitFor();
 check(language+' defaults to 2D',await page.locator('#battlefield-canvas').getAttribute('data-renderer')==='2d');
 check(language+' Bootcamp title',await page.locator('.game-title').innerText().then(t=>t.includes(language==='en'?'Bootcamp':'新兵训练营')));
 await page.locator('.debug-panel summary').click();await page.locator('[data-debug="mute"]').check();
}
async function freeze(){await page.evaluate(()=>{window.ra2.game.paused=true;window.ra2.renderer.edgeScroll=false;});}
async function refs(){await page.evaluate(()=>{
 const {game,renderer}=window.ra2;window.bootcampReferences={game,renderer,map:game.map,entities:[...game.entities]};
 window.bootcampSnapshot=JSON.stringify({entities:game.entities,players:game.players,time:game.time,ore:game.ore,events:game.events,effects:game.effects,selection:[...renderer.selection],placement:renderer.placement?.id});
});}
async function same(){return page.evaluate(()=>{
 const {game,renderer}=window.ra2,r=window.bootcampReferences;
 return game===r.game&&renderer===r.renderer&&game.map===r.map&&r.entities.every(e=>game.getEntity(e.id)===e)&&window.bootcampSnapshot===JSON.stringify({entities:game.entities,players:game.players,time:game.time,ore:game.ore,events:game.events,effects:game.effects,selection:[...renderer.selection],placement:renderer.placement?.id});
});}
async function screen(x,y){return page.evaluate(({x,y})=>{const r=window.ra2.renderer,p=r.toScreen(x,y),b=r.canvas.getBoundingClientRect();return{x:p.x+b.x,y:p.y+b.y};},{x,y});}
async function clickAt(point,button='left'){await page.mouse.click(point.x,point.y,{button});}
try {
 await enter('zh-CN');await freeze();await shot('default-2d');
 await refs();await mode('3d');check('all twelve templates loaded',await page.evaluate(()=>window.ra2.renderer.modelLayer.templates.size===12));check('first switch retains exact state',await same());await shot('training-field-3d');
 for(let i=0;i<3;i++){await mode('2d');check('3D -> 2D exact state '+i,await same());await mode('3d');check('2D -> 3D exact state '+i,await same());}
 // Enumerate every production icon through the ordinary categories; unsupported types never appear.
 const catalog=await page.evaluate(()=>window.ra2.game.getAvailable(0).map(d=>({id:d.id,kind:d.kind,category:d.category})));
 check('12 allowed production types',catalog.length===12);
 for(const d of catalog) {
   const category=['vehicle','aircraft','naval'].includes(d.category)?'vehicle':d.category;
   await page.locator(`[data-category="${category}"]`).click();
   const before=await page.evaluate(type=>window.ra2.game.entities.filter(e=>e.type===type&&e.owner===0).length,d.id);
   await page.locator(`[data-build="${d.id}"]`).click();
   if(d.kind==='building'){
     check(d.id+' instantly ready',await page.evaluate(type=>window.ra2.game.players[0].queues.structure.some(q=>q.type===type&&q.ready),d.id));
     await page.locator(`[data-build="${d.id}"]`).click();
     const point=await page.evaluate(type=>{
       const {game,renderer}=window.ra2,p=game.players[0].spawn;
       for(let radius=6;radius<22;radius++)for(let y=p.y-radius;y<=p.y+radius;y++)for(let x=p.x-radius;x<=p.x+radius;x++)if(game.canPlace(0,type,x,y)){renderer.center(x,y);return{x,y};}
     },d.id);
     assert.ok(point,'placement available '+d.id);await clickAt(await screen(point.x,point.y));
   }
   check(d.id+' produced through UI',await page.evaluate(({type,before})=>window.ra2.game.entities.filter(e=>e.type===type&&e.owner===0).length===before+1,{type:d.id,before}));
   await page.evaluate(type=>{const {game,renderer}=window.ra2,e=game.entities.filter(e=>e.type===type&&e.owner===0).at(-1);renderer.center(e.x,e.y);renderer.setSelection([e.id]);renderer.draw();},d.id);
   check(d.id+' has real visible model',await page.evaluate(type=>{const {game,renderer}=window.ra2,e=game.entities.filter(e=>e.type===type&&e.owner===0).at(-1),m=renderer.modelLayer.models.get(e.id);return !!m?.root.children.length&&m.group.visible;},d.id));
   await shot('model-'+d.id);
 }
 for(const cat of ['structure','defense','infantry','vehicle']){
   await page.locator(`[data-category="${cat}"]`).click();
   const actual=await page.locator('[data-build]').evaluateAll(nodes=>nodes.map(n=>n.dataset.build));
   check(cat+' contains whitelist only',actual.every(id=>catalog.some(d=>d.id===id)));
 }
 check('engine denies unsupported type',await page.evaluate(()=>!window.ra2.game.build(0,'grizzly')));
 // Actual canvas selection/movement, switching with an outstanding order and selection.
 await page.locator('.debug-panel summary').click();
 const unit=await page.evaluate(()=>{const {game,renderer}=window.ra2,e=game.entities.find(e=>e.owner===0&&e.type==='rocketeer');renderer.center(e.x,e.y);renderer.setSelection([]);renderer.draw();return{id:e.id,x:e.x,y:e.y};});
 const pick=await page.evaluate(id=>{const r=window.ra2.renderer,b=r.modelLayer.boxes.get(id),rect=r.canvas.getBoundingClientRect();return{x:rect.x+b.x+b.w/2,y:rect.y+b.y+b.h/2};},unit.id);
 await clickAt(pick);check('3D canvas selects flying unit',await page.evaluate(id=>window.ra2.renderer.selection.has(id),unit.id));
 const goal={x:unit.x+5,y:unit.y+3};await clickAt(await screen(goal.x,goal.y),'right');
 check('3D right click issues move',await page.evaluate(id=>window.ra2.game.getEntity(id).order.kind==='move',unit.id));
 await page.locator('.debug-panel summary').click();await refs();await mode('2d');check('selection and outstanding order retained',await same());await mode('3d');check('roundtrip with outstanding order retained',await same());
 await page.evaluate(()=>window.ra2.game.paused=false);await page.waitForFunction(({id,x,y})=>{const e=window.ra2.game.getEntity(id);return Math.hypot(e.x-x,e.y-y)>.1;},unit,{timeout:10000});
 await page.waitForTimeout(600);await freeze();
 check('movement continues after switches',await page.evaluate(({id,x,y})=>{const e=window.ra2.game.getEntity(id);return Math.hypot(e.x-x,e.y-y)>.1;},unit));
 // Paused engine time means clips retain their exact phase in either presentation.
 await refs();const clip=await page.evaluate(id=>{const m=window.ra2.renderer.modelLayer.models.get(id);return{time:m.action?.time,name:m.playing};},unit.id);
 await mode('2d');await mode('3d');check('animation phase follows same engine time',await page.evaluate(({id,clip})=>{const m=window.ra2.renderer.modelLayer.models.get(id);return m.playing===clip.name&&m.action?.time===clip.time;},{id:unit.id,clip}));
 // Verify a context loss returns safely to 2D, without replacing the match.
 await refs();await page.evaluate(()=>window.ra2.renderer.modelLayer.webgl.forceContextLoss());await page.waitForFunction(()=>document.querySelector('canvas[data-renderer]')?.dataset.renderer==='2d');check('context loss retains state',await same());await shot('context-loss');
 await mode('3d');check('context loss can retry',await same());
 // Exit disposes GPU resources and observers; next battle defaults to 2D.
 await page.evaluate(()=>{window.oldLayer=window.ra2.renderer.modelLayer;window.oldGame=window.ra2.game;});
 await page.locator('#game-options').click();await page.locator('#leave').click();
 check('exit disposes model layer',await page.evaluate(()=>window.oldLayer.disposed && window.oldLayer.models.size===0 && !window.ra2.game));
 await enter('en');await freeze();await shot('english-2d');
 check('new battle is new engine',await page.evaluate(()=>window.ra2.game!==window.oldGame));
 // Simulate actual fetch failure, then retry with network restored.
 await page.evaluate(()=>{window.originalFetch=window.fetch;window.fetch=(url,...args)=>String(url).includes('/app/models/')?Promise.resolve(new Response('',{status:503})):window.originalFetch(url,...args);});
 await page.getByTestId('renderer-3d').click();await page.getByTestId('renderer-status').filter({hasText:'failed'}).waitFor();
 check('failed load keeps 2D',await page.locator('#battlefield-canvas').getAttribute('data-renderer')==='2d');await shot('load-failure');
 await page.evaluate(()=>window.fetch=window.originalFetch);await mode('3d');
 // Only one engine update owner, independent of how many roundtrips have occurred.
 await page.evaluate(()=>{window.stepCount=0;const g=window.ra2.game,step=g.step.bind(g);g.step=dt=>{window.stepCount++;step(dt);};});
 for(let i=0;i<5;i++){await mode('2d');await mode('3d');}
 const rate=await page.evaluate(async()=>{window.stepCount=0;let frames=0;await new Promise(resolve=>{const frame=()=>{frames++;if(frames===12)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});return{steps:window.stepCount,frames};});
 check('one engine step per animation frame',Math.abs(rate.steps-rate.frames)<=1);
 await page.locator('#game-options').click();await page.locator('#leave').click();
 await page.getByTestId('mode-skirmish').click();await page.locator('#start').waitFor();await page.locator('#start').click();
 check('normal skirmish still creates MCV',await page.evaluate(()=>!window.ra2.game.bootcamp&&window.ra2.game.entities.some(e=>e.type==='allied_mcv')));
 check('normal skirmish has no 3D toggle',await page.getByTestId('renderer-3d').count()===0);
 check('no browser page errors',errors.length===0);
 console.log(JSON.stringify({url,productionTypes:catalog.length,rate,errors}));
} finally {await browser.close();}
