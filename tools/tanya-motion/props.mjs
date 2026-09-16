// Rigid pistols share source position/UV buffers but have independent animation.
// Hand-space attachment prevents gun bending; authored release/catch paths cover idle/death.
import * as T from 'three';
import {weaponVisible} from './action-keys.mjs';
const v=()=>new T.Vector3(),q=()=>new T.Quaternion();
export function createPropSampler(poser){
 const inverse={},restPoint={};for(const side of ['Left','Right']){const hand=poser.bones[side+'Hand'];inverse[side]=hand.matrixWorld.clone().invert();restPoint[side]=hand.getWorldPosition(v());}
 const flights=new Map();
 function attached(side){return poser.bones[side+'Hand'].matrixWorld.clone().multiply(inverse[side]);}
 function flightSpec(name,side){
  if(name==='idle2'&&side==='Right')return {start:3/15,end:11/15,height:.90,catch:true};
  if(name==='die1'||name==='die2')return {start:(side==='Right'?1:3)/14,end:(side==='Right'?6:8)/14,height:.40,catch:false};
 }
 function prepare(name){
  for(const side of ['Left','Right']){const spec=flightSpec(name,side);if(!spec)continue;
   poser.pose(name,spec.start);const a=attached(side),start=poser.bones[side+'Hand'].getWorldPosition(v());
   poser.pose(name,spec.end);const b=attached(side),end=spec.catch?poser.bones[side+'Hand'].getWorldPosition(v()):new T.Vector3(side==='Left'?.50:-.50,.075,.27);
   const qa=q(),qb=q();a.decompose(v(),qa,v());b.decompose(v(),qb,v());
   if(!spec.catch)qb.setFromEuler(new T.Euler(-Math.PI/2,side==='Left'?.4:-.4,0));
   flights.set(name+side,{...spec,startPoint:start,endPoint:end,qa,qb});
  }
 }
 function sample(name,side,phase){
  const f=flights.get(name+side),visible=weaponVisible(name,side);let matrix=attached(side);
  if(f&&phase>=f.start&&(!f.catch||phase<f.end)){
   const u=T.MathUtils.clamp((phase-f.start)/(f.end-f.start),0,1),rotation=f.qa.clone().slerp(f.qb,u).premultiply(q().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI*2*u));
   const point=f.startPoint.clone().lerp(f.endPoint,u);point.y+=f.height*4*u*(1-u);
   matrix=new T.Matrix4().compose(point.sub(restPoint[side].clone().applyQuaternion(rotation)),rotation,new T.Vector3(1,1,1));
  }
  const position=v(),rotation=q();matrix.decompose(position,rotation,v());
  return {translation:position.toArray(),rotation:rotation.normalize().toArray(),scale:visible?[1,1,1]:[0,0,0]};
 }
 return {prepare,sample};
}
