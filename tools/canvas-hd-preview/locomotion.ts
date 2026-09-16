// Preview-only motion sampling: source frame inspection is independent of dense HD playback.
import type {Sprite} from '@game/assets';
import type {GameEngine} from '@game/game/engine';
import type {BattlefieldRenderer} from '@game/renderer';
import {spriteFacing} from '@game/sprite-animation';

export function motionFrame(sprite:Sprite,name:string,phase:number,angle:number){
 const seq=sprite.motionSequences?.[name];if(!seq)return undefined;
 const p=seq.once?Math.max(0,Math.min(.999999,phase)):((phase%1)+1)%1;
 return seq.start+spriteFacing(sprite,angle)*seq.count+Math.min(seq.count-1,Math.floor(p*seq.count));
}
export function installLocomotion(game:GameEngine,renderer:BattlefieldRenderer){
 const previous=renderer.entityPresentation,states=new Map<number,{x:number;y:number;phase:number;moving:boolean}>();
 renderer.entityPresentation=e=>{
  const view=previous?.(e);if(e.type!=='tanya'||view?.frame!=null)return view;
  const s=renderer.assets.sprite('tany'),state=states.get(e.id);if(!s?.motionSequences||!state?.moving||game.time-e.lastShot<.5)return view;
  return {...view,action:'walk',animationPhase:state.phase,frame:motionFrame(s,'walk',state.phase,e.angle)};
 };
 return {update(){for(const e of game.entities){if(e.type!=='tanya')continue;const old=states.get(e.id),d=old?Math.hypot(e.x-old.x,e.y-old.y):0;
  // At bake scale, 20 pixels/metre and a 60×30 tile imply 3/sqrt(2) metres per cell.
  const stride=renderer.assets.sprite('tany')?.motionSequences?.walk?.distance||1.3;
  states.set(e.id,{x:e.x,y:e.y,phase:(old?.phase||0)+(d<.5?d*3/Math.sqrt(2)/stride:0),moving:d>1e-7&&d<.5});
 }},states};
}
// An oval inside the installed original pool; tangent headings replace instant 180° flips.
export function swimRoute(time:number){
 const duration=1.35,travelTime=duration*12,total=travelTime+.55+1.35+2+.55;
 const t=((time%total)+total)%total;
 if(t>=travelTime){const rest=t-travelTime;
  return {x:17,y:11.5,angle:0,action:rest<.55?'swimstop':rest<1.90?'tread':rest<3.90?'wetattack':'swimstart',phase:rest<.55?rest/.55:rest<1.9?(rest-.55)/1.35:rest<3.9?(rest-1.9)/.5:(rest-3.9)/.55};
 }
 const cycle=t/duration,phase=cycle%1;
 // Forward displacement grows through the kick then glides; positive speed at every phase.
 const stroke=phase-.11/(2*Math.PI)*Math.sin(2*Math.PI*phase);
 const r=.35,arc=Math.PI*r,length=6+2*arc,d=(Math.floor(cycle)+stroke)/12*length;
 let x,y,angle;
 if(d<3){x=17+d;y=11.5;angle=0;}
 else if(d<3+arc){const a=(d-3)/r;x=20+r*Math.sin(a);y=11.85-r*Math.cos(a);angle=a;}
 else if(d<6+arc){x=20-(d-3-arc);y=12.2;angle=Math.PI;}
 else{const a=(d-6-arc)/r;x=17-r*Math.sin(a);y=11.85+r*Math.cos(a);angle=Math.PI+a;}
 return {x,y,angle,action:'swim',phase};
}
