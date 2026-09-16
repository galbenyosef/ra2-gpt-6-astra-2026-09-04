// The shared IK/rest-pose closure keeps these action solvers together; this file exceeds 5 KB but remains under 150 lines.
// Metre-space skeletal targets authored against Tanya's original action sheets.
// Crawl retains the accepted six keys; other actions have separate support/prop poses.
import * as T from 'three';
import {crawlKey} from './crawl-keys.mjs';
import {runningFoot,smoothstep} from './locomotion.mjs';
import {keyAt,swimHandKeys,swimFootKeys,treadKeys,recoilKeys,idle1Keys,idle2Keys,cheerKeys,wetIdle1Keys,wetIdle2Keys,death1Keys,death2Keys,wetDeath1Keys,wetDeath2Keys} from './action-keys.mjs';
const V=(x,y,z)=>new T.Vector3(x,y,z),Q=(x,y=0,z=0)=>new T.Quaternion().setFromEuler(new T.Euler(x,y,z));
const tau=Math.PI*2,lerp=T.MathUtils.lerp,clamp=T.MathUtils.clamp;
export function createPoser(scene){
 const bones={};scene.traverse(o=>{if(o.isBone)bones[o.name]=o;});scene.updateMatrixWorld(true);
 const rest=Object.fromEntries(Object.entries(bones).map(([k,b])=>[k,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),wq:b.getWorldQuaternion(new T.Quaternion())}]));
 function reset(){for(const[k,b]of Object.entries(bones)){b.position.copy(rest[k].p);b.quaternion.copy(rest[k].q);b.scale.copy(rest[k].s);}scene.updateMatrixWorld(true);}
 function worldQ(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));scene.updateMatrixWorld(true);}
 function aim(b,child,target){const p=b.getWorldPosition(new T.Vector3()),a=child.getWorldPosition(new T.Vector3()).sub(p).normalize(),d=target.clone().sub(p).normalize();worldQ(b,new T.Quaternion().setFromUnitVectors(a,d).multiply(b.getWorldQuaternion(new T.Quaternion())));}
 function limb(side,kind,target,pole,endQ){
  const names=kind==='arm'?['Arm','ForeArm','Hand']:['UpLeg','Leg','Foot'],[a,b,c]=names.map(n=>bones[side+n]);
  const origin=a.getWorldPosition(new T.Vector3()),joint=b.getWorldPosition(new T.Vector3()),end=c.getWorldPosition(new T.Vector3()),l1=joint.distanceTo(origin),l2=end.distanceTo(joint);
  const delta=target.clone().sub(origin),d=clamp(delta.length(),Math.abs(l1-l2)+.001,l1+l2-.001),dir=delta.normalize(),plane=pole.clone().sub(origin);plane.addScaledVector(dir,-plane.dot(dir)).normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  aim(a,b,origin.clone().addScaledVector(dir,along).addScaledVector(plane,height));aim(b,c,origin.clone().addScaledVector(dir,d));if(endQ)worldQ(c,endQ);
 }
 function root(y,pitch=0,z=0,roll=0,yaw=0){const b=bones.Hips;worldQ(b,Q(pitch,yaw,roll).multiply(rest.Hips.wq));b.position.copy(b.parent.worldToLocal(V(0,y,z)));scene.updateMatrixWorld(true);}
 function hand(side,target,pitch=0,poleY=1.05,yaw=0){const sign=side==='Left'?1:-1;limb(side,'arm',V(...target),V(sign*.43,poleY,.12),Q(pitch,yaw).multiply(rest[side+'Hand'].wq));}
 function standing(yaw=0){root(.93,0,0,0,yaw);for(const[side,sign]of [['Left',1],['Right',-1]]){limb(side,'leg',V(sign*.13,side==='Left'?.118:.127,sign*.035),V(sign*.16,.47,.35),rest[side+'Foot'].wq.clone());hand(side,[sign*.28,.84,.02]);}}
 function runningPose(p){
  const wave=Math.sin(tau*p),bounce=.028*(1-Math.cos(2*tau*p));root(.82+bounce,.10,0,.018*wave);
  worldQ(bones.Spine,Q(.055,-.06*wave).multiply(rest.Spine.wq));worldQ(bones.Head,Q(.035,-.025*wave).multiply(rest.Head.wq));
  for(const[side,sign,offset]of [['Left',1,0],['Right',-1,.5]]){const f=runningFoot(p+offset+.23),ankle=side==='Left'?.118:.127;limb(side,'leg',V(sign*.12,ankle+f.lift,f.z),V(sign*.15,.45,.65),Q(f.pitch).multiply(rest[side+'Foot'].wq));}
  // Source running holds the right pistol near the shoulder; only the low arm swings widely.
  hand('Right',[-.22,1.29+bounce*.3,.12+.025*wave],-2.85,1.03,-.08);
  hand('Left',[.27,.88+bounce*.3,.07-.13*Math.cos(tau*p)],-.15,.99,.06);
 }
 function swimmingPose(p){
  const a=keyAt(swimHandKeys,p),f=keyAt(swimFootKeys,p),wave=Math.sin(tau*p);root(.17+.012*wave,Math.PI/2-.045,0,.018*wave);
  worldQ(bones.neck,Q(.55).multiply(rest.neck.wq));worldQ(bones.Head,Q(.20).multiply(rest.Head.wq));
  for(const[side,sign,i]of [['Left',1,0],['Right',-1,1]]){
   limb(side,'arm',V(sign*a[0],a[1],a[2]),V(sign*.53,.09,.46),Q(-Math.PI/2,sign*.18).multiply(rest[side+'Hand'].wq));
   limb(side,'leg',V(sign*.12,f[i],f[i+2]),V(sign*.17,-.17,-.38),Q(2.50+sign*.14*wave).multiply(rest[side+'Foot'].wq));
  }
 }
 function crawlingPose(p){
  const k=crawlKey(p);root(.18,Math.PI/2-.065,0,k.roll);worldQ(bones.neck,Q(.58).multiply(rest.neck.wq));worldQ(bones.Head,Q(.18).multiply(rest.Head.wq));
  for(const[side,sign,key]of [['Left',1,'left'],['Right',-1,'right']]){limb(side,'leg',V(...k[key+'Foot']),V(sign*.43,.07,-.27),Q(2.35,sign*.22).multiply(rest[side+'Foot'].wq));limb(side,'arm',V(...k[key+'Hand']),V(sign*.40,.085,.39),Q(-Math.PI/2,sign*.10).multiply(rest[side+'Hand'].wq));}
 }
 function firing(p,prone=false){
  const r=keyAt(recoilKeys,p);if(prone){crawlingPose(0);hand('Left',[.28,.105,.57],-1.5,.09,.1);hand('Right',[-.19,.32+r[0]*.4,.84-r[0]],-Math.PI/2-r[0]*2,.16,-.04);}
  else{standing();worldQ(bones.Spine,Q(.035,0,.01).multiply(rest.Spine.wq));hand('Left',[.18,1.26+r[1]*.6,.55-r[1]],-Math.PI/2-r[1]*2,1.05,.04);hand('Right',[-.18,1.32+r[0]*.6,.58-r[0]],-Math.PI/2-r[0]*2,1.10,-.04);}
 }
 function tread(p,firing=false){
  const a=keyAt(treadKeys,p),wave=Math.sin(tau*p);root(.92+a[3]*.3,.035);
  for(const[side,sign]of [['Left',1],['Right',-1]]){limb(side,'leg',V(sign*(.13+.04*(1+sign*wave)),.16+.05*sign*wave,.10*sign*wave),V(sign*.26,.46,.32),Q(.12*sign*wave).multiply(rest[side+'Foot'].wq));hand(side,[sign*a[0],a[1],a[2]+sign*.025*wave],-1.05,1.08,sign*.65);}
  if(firing){const r=keyAt(recoilKeys,p)[0];hand('Right',[-.19,1.32+r*.5,.57-r],-Math.PI/2-r*2,1.11,-.04);}
 }
 // Rotate relative limb targets with the torso for diving/tumbling. World targets
 // for seated/contact states prevent a stiff rotating mannequin penetrating ground.
 function bodyPose(k,phase,seated=false,wet=false){
  const[y,pitch,roll,spread,handY,handZ,yaw=0]=k,rotation=Q(pitch,yaw,roll),point=(x,h,z)=>V(x,h,z).applyQuaternion(rotation).add(V(0,y,0));root(y,pitch,0,roll,yaw);
  for(const[side,sign]of [['Left',1],['Right',-1]]){
   limb(side,'arm',point(sign*spread,handY,handZ),point(sign*.52,.15,.20),rotation.clone().multiply(rest[side+'Hand'].wq));
   const foot=seated?V(sign*.18,.12,.53+sign*.06):point(sign*.14,-.79,sign*.06+(wet?.04*Math.sin(tau*phase)*sign:0));
   limb(side,'leg',foot,seated?V(sign*.23,.29,.28):point(sign*.23,-.42,.25),rotation.clone().multiply(rest[side+'Foot'].wq));
  }
 }
 function wetIdle(p,variant){const k=keyAt(variant===1?wetIdle1Keys:wetIdle2Keys,p),[y,pitch,dy,spread,z]=k;bodyPose([y,pitch,0,spread,dy,z],p,false,true);}
 function death(p,variant,wet){const keys=wet?(variant===1?wetDeath1Keys:wetDeath2Keys):(variant===1?death1Keys:death2Keys);bodyPose(keyAt(keys,p,true),p,!wet&&variant===2&&p>=8/14&&p<=12/14,wet);}
 function crouch(t){
  root(lerp(.60,.37,t),lerp(.55,.94,t));worldQ(bones.neck,Q(.25+.20*t).multiply(rest.neck.wq));
  for(const[side,sign]of [['Left',1],['Right',-1]]){limb(side,'leg',V(sign*lerp(.17,.23,t),.12,sign>0?lerp(.06,-.12,t):lerp(-.20,-.48,t)),V(sign*.33,.15,.23),Q(.25+t*.4).multiply(rest[side+'Foot'].wq));hand(side,[sign*.28,lerp(.35,.13,t),lerp(.40,.60,t)],-Math.PI/2,.18,sign*.10);}
 }
 function transition(p,up){
  const t=up?1-p:p;
  if(t<=1/3){standing();const a=capture();reset();crouch(0);blend(a,smoothstep(t*3));}
  else if(t<=2/3)crouch(t*3-1);
  else{crouch(1);const a=capture();reset();crawlingPose(0);blend(a,smoothstep(t*3-2));}
 }
 function idle(p,variant){
  standing();if(variant===1){const a=keyAt(idle1Keys,p),yaw=a[0],r=Q(0,yaw);root(.93,0,0,0,yaw);
   for(const[side,sign]of [['Left',1],['Right',-1]]){limb(side,'leg',V(sign*.13,side==='Left'?.118:.127,sign*.035).applyQuaternion(r),V(sign*.17,.47,.35).applyQuaternion(r),r.clone().multiply(rest[side+'Foot'].wq));const h=side==='Right'?a.slice(1,4):a.slice(4,7),pitch=side==='Right'?a[7]:a[4]>.32?-1.2:0;limb(side,'arm',V(...h).applyQuaternion(r),V(sign*.43,1.04,.12).applyQuaternion(r),r.clone().multiply(Q(pitch)).multiply(rest[side+'Hand'].wq));}
  }
  else{const a=keyAt(idle2Keys,p);hand('Right',[-.24,a[0],a[1]],a[2],1.08,-.08);worldQ(bones.Head,Q(-.12*Math.sin(Math.PI*p)**2).multiply(rest.Head.wq));}
 }
 function capture(){return Object.fromEntries(Object.entries(bones).map(([n,b])=>[n,{p:b.position.clone(),q:b.quaternion.clone()}]));}
 function blend(a,t){for(const[n,b]of Object.entries(bones)){b.position.lerpVectors(a[n].p,b.position,t);b.quaternion.slerpQuaternions(a[n].q,b.quaternion.clone(),t);}}
 function pose(name,phase){
  reset();const p=clamp(phase,0,1);
  if(name==='swimstop'||name==='swimstart'){
   swimmingPose(0);const a=capture();reset();tread(0);scene.updateMatrixWorld(true);const w=bones.Hips.getWorldPosition(new T.Vector3()).add(V(0,-.90,0));bones.Hips.position.copy(bones.Hips.parent.worldToLocal(w));blend(a,smoothstep(name==='swimstop'?p:1-p));
  }else if(name==='walk'||name==='panic')runningPose(p);
  else if(name==='swim')swimmingPose(p);
  else if(name==='crawl'||name==='prone')crawlingPose(name==='prone'?0:p);
  else if(name==='fireprone'||name==='fireup')firing(p,name==='fireprone');
  else if(name==='down'||name==='up')transition(p,name==='up');
  else if(name==='tread'||name==='wetattack')tread(p,name==='wetattack');
  else if(name==='wetidle1'||name==='wetidle2')wetIdle(p,name.endsWith('1')?1:2);
  else if(['die1','die2','wetdie1','wetdie2'].includes(name))death(p,name.endsWith('1')?1:2,name.startsWith('wet'));
  else if(name==='idle1'||name==='idle2')idle(p,name.endsWith('1')?1:2);
  else if(name==='cheer'){standing();const a=keyAt(cheerKeys,p);hand('Right',[-.25,a[0],.32],a[1],1.39,-.1);}
  else if(name==='paradrop'){standing();hand('Left',[.26,1.68,.10],-3.0,1.35,.1);hand('Right',[-.26,1.68,.10],-3.0,1.35,-.1);}
  else standing();
  scene.updateMatrixWorld(true);return bones;
 }
 return {pose,bones,rest};
}
