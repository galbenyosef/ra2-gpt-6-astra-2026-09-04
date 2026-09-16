import {motionFrame,swimRoute} from './locomotion';
// Scripted inspection routes use native terrain and the same clock for both art versions.
import type {Sprite} from '@game/assets';
import {spriteFacing} from '@game/sprite-animation';
import type {GameEngine} from '@game/game/engine';
import type {BattlefieldRenderer} from '@game/renderer';
export function createMapDemos(game:GameEngine,renderer:BattlefieldRenderer,sprites:Record<string,Sprite>,groundHeight:(x:number,y:number)=>number){
 const prone=game.spawnEntity('tanya',0,12,21),target=game.spawnEntity('tanya',1,15,21),swim=game.spawnEntity('tanya',0,17,11.5),slope=game.spawnEntity('tanya',0,24,33),waterTarget=game.spawnEntity('tanya',1,22.4,11.5);
 const entities={prone,target,swim,slope,waterTarget};for(const e of Object.values(entities))e.holdFire=true;
 let attacking=false,waterAttacking=false,phase=0,waterPhase=0,height=0,swimState=swimRoute(0);
 renderer.entityPresentation=e=>{
  if(e===swim){const sprite=renderer.assets.sprite('tany');if(sprite&&sprites.tany.motionSequences){
   const frame=motionFrame(sprite,swimState.action,swimState.phase,e.angle),action=swimState.action.startsWith('swim')&&swimState.action!=='swim'?'tread':swimState.action;
   const seq=sprite.sequences?.[action];
   return {sprite,frame:frame??(seq?seq[0]+spriteFacing(sprite,e.angle)*seq[2]+Math.floor(swimState.phase*seq[1])%seq[1]:0),action,animationPhase:swimState.phase,swimming:true};
  }}
  if(e===slope)return {height,lean:e.angle===0?-.08:.08};
  if(e!==prone&&e!==swim)return;
  if(e===prone&&phase>=6+2/12)return;
  const action=e===swim?(waterPhase<8?'swim':waterPhase<10?'tread':'wetattack'):phase<2/12?'down':phase<2.5?'crawl':phase<3?'prone':phase>=6?'up':'fireprone';
  const sprite=renderer.assets.sprite('tany');if(!sprite)return;
  if(sprite.animationClock!=='source'&&sprite.hdMotion){
   const draft=sprites['tany-actions'],legacyAction=e===swim?'swim':phase<1||phase>=6?'prone':'pronefire';const seq=draft?.sequences?.[legacyAction];if(!seq)return;
   const f=e===swim?Math.floor(game.time*8)%8:phase<1?Math.min(3,Math.floor(phase*4)):phase>=6?3-Math.min(3,Math.floor((phase-6)*4)):Math.floor(game.time*8)%4;
   return {sprite:draft,action:legacyAction,frame:seq[0]+spriteFacing(draft,e.angle)*seq[2]+f,swimming:e===swim};
  }
  const sequence=sprite.sequences?.[action];if(!sequence)return;
  const elapsed=action==='down'?phase:action==='up'?phase-6:game.time;
  const frame=action==='down'||action==='up'?Math.min(sequence[1]-1,Math.floor(elapsed*12)):Math.floor(elapsed*12)%sequence[1];
  return {sprite,action,frame:sequence[0]+spriteFacing(sprite,e.angle)*sequence[2]+frame,swimming:e===swim};
 };
 return {entities,update(time:number){
  phase=time%8;waterPhase=time%12;swimState=swimRoute(time);const shouldAttack=phase>=3&&phase<6,shouldWaterAttack=swimState.action==='wetattack';
  if(shouldAttack!==attacking){attacking=shouldAttack;if(attacking)game.commandAttack([prone.id],target.id);else game.commandStop([prone.id]);}
  if(shouldWaterAttack!==waterAttacking){waterAttacking=shouldWaterAttack;if(waterAttacking)game.commandAttack([swim.id],waterTarget.id);else game.commandStop([swim.id]);}
  prone.x=12+(phase>2/12&&phase<2.5?.35*(phase-2/12):phase>=2.5?.82:0);prone.y=21;prone.angle=0;
  // Positions are preview routes, not changes to amphibious pathfinding or balance.
  swim.x=swimState.x;swim.y=swimState.y;swim.angle=swimState.angle;
  const u=(time%12)/6,forward=u<1,t=forward?u:2-u;slope.x=24+5*t;slope.y=33;slope.angle=forward?0:Math.PI;
  height=groundHeight(slope.x,slope.y)-(renderer.map.elevations?.[Math.round(slope.y)*game.map.width+Math.round(slope.x)]||0)*15;
  slope.path=[{x:forward?29:24,y:33}];slope.lastMovedAt=time;slope.order={kind:'idle'};
 }};
}
export function drawDemoTerrain(ctx:CanvasRenderingContext2D,renderer:BattlefieldRenderer,time:number){
 ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e7e8bd';
 for(const [x,y,label] of [[12,20,'卧倒 → 匍匐 → 卧射 → 起身'],[18,9.4,'游泳 → 踩水 → 水中射击'],[28,35,'原版坡地 · 上坡 / 下坡']] as const){const p=renderer.project(x,y);ctx.fillText(label,p.x,p.y-10);}ctx.textAlign='start';
}
