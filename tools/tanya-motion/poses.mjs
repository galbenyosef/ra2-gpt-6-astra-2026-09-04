// World-space joint targets reconstructed from Tanya SHP pose sheets (metres).
// Geometry and skin weights are unchanged; limb bending uses two-bone IK.
import * as T from 'three';
const V=(x,y,z)=>new T.Vector3(x,y,z),Q=(x,y=0,z=0)=>new T.Quaternion().setFromEuler(new T.Euler(x,y,z));
const tau=Math.PI*2,lerp=T.MathUtils.lerp,clamp=T.MathUtils.clamp;
export function createPoser(scene,running){
 const bones={};scene.traverse(o=>{if(o.isBone)bones[o.name]=o;});scene.updateMatrixWorld(true);
 const rest=Object.fromEntries(Object.entries(bones).map(([k,b])=>[k,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),wq:b.getWorldQuaternion(new T.Quaternion())}]));
 const mixer=new T.AnimationMixer(scene),run=mixer.clipAction(running);run.play();
 function reset(){for(const[k,b]of Object.entries(bones)){b.position.copy(rest[k].p);b.quaternion.copy(rest[k].q);b.scale.copy(rest[k].s);}scene.updateMatrixWorld(true);}
 function worldQ(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));scene.updateMatrixWorld(true);}
 function aim(b,child,target){const p=b.getWorldPosition(new T.Vector3()),a=child.getWorldPosition(new T.Vector3()).sub(p).normalize(),d=target.clone().sub(p).normalize();const q=new T.Quaternion().setFromUnitVectors(a,d).multiply(b.getWorldQuaternion(new T.Quaternion()));worldQ(b,q);}
 function limb(side,kind,target,pole,endQ){
  const names=kind==='arm'?['Arm','ForeArm','Hand']:['UpLeg','Leg','Foot'];const [a,b,c]=names.map(n=>bones[side+n]);
  const origin=a.getWorldPosition(new T.Vector3()),joint=b.getWorldPosition(new T.Vector3()),end=c.getWorldPosition(new T.Vector3());const l1=joint.distanceTo(origin),l2=end.distanceTo(joint);
  const delta=target.clone().sub(origin),d=clamp(delta.length(),Math.abs(l1-l2)+.001,l1+l2-.001),dir=delta.normalize();
  const plane=pole.clone().sub(origin);plane.addScaledVector(dir,-plane.dot(dir)).normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const elbow=origin.clone().addScaledVector(dir,along).addScaledVector(plane,height);aim(a,b,elbow);aim(b,c,origin.clone().addScaledVector(dir,d));if(endQ)worldQ(c,endQ);
 }
 function root(y,pitch=0,z=0,roll=0){const b=bones.Hips;worldQ(b,Q(pitch,0,roll).multiply(rest.Hips.wq));b.position.copy(b.parent.worldToLocal(V(0,y,z)));scene.updateMatrixWorld(true);}
 function hands(mode,phase,y=1.29,z=.42){
  const recoil=[.07,0,0,.07,0,0][Math.floor(phase*6)%6];
  for(const [side,sign]of [['Left',1],['Right',-1]]){
   const raised=mode==='fire';const stagger=(sign>0?phase:phase+.5)%1<.5;
   const target=raised?V(sign*.18,y+(stagger?recoil*.5:0),z-(stagger?recoil:0)):V(sign*.29,.93,.1);
   limb(side,'arm',target,V(sign*.40,y-.22,.14),raised?Q(-Math.PI/2,sign*.12).multiply(rest[side+'Hand'].wq):rest[side+'Hand'].wq.clone());
  }
 }
 function prone(phase=0,crawling=false,firing=false,swimming=false){
  const swing=Math.sin(tau*phase),pitch=Math.PI/2-(swimming?.10:.04);
  root(swimming?.22:.24,pitch,0,crawling?.04*swing:0);
  // Keep eyes toward travel/target; the chest remains horizontal.
  worldQ(bones.neck,Q(.6).multiply(rest.neck.wq));worldQ(bones.Head,Q(.23).multiply(rest.Head.wq));
  for(const [side,sign]of [['Left',1],['Right',-1]]){
   const alternating=sign*swing;const knee=crawling?Math.max(0,alternating):0;
   limb(side,'leg',V(sign*(.15+knee*.08),.10+(swimming?.035*alternating:0),-.80+(crawling?.24*knee:0)),V(sign*.30,.28,-.35),Q(pitch).multiply(rest[side+'Foot'].wq));
   if(swimming){
    // SHP Swim: both forearms recover forward, sweep out and pull back; legs alternate.
    const keys=[[.30,.16,.43],[.20,.13,.68],[.35,.12,.70],[.53,.14,.47],[.50,.16,.27],[.34,.17,.28],[.30,.16,.43]];
    const p=phase*6,i=Math.floor(p)%6,t=p-i,a=keys[i],b=keys[i+1];
    limb(side,'arm',V(sign*lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)),V(sign*.55,.20,.39),Q(-Math.PI/2,sign*.4).multiply(rest[side+'Hand'].wq));
   }else if(firing){
    const kick=(Math.floor(phase*6)%3===0)?.035:0;
    limb(side,'arm',V(sign*.17,.30,.76-kick),V(sign*.35,.13,.38),Q(-Math.PI/2,sign*.12).multiply(rest[side+'Hand'].wq));
   }else{
    limb(side,'arm',V(sign*.27,.13,.59+(crawling?.12*alternating:0)),V(sign*.43,.12,.37),Q(-Math.PI/2,sign*.4).multiply(rest[side+'Hand'].wq));
   }
  }
 }
 function tread(phase,firing=false,idle=0){
  root(.92+.018*Math.sin(tau*phase),.06);
  const wave=Math.sin(tau*phase);
  for(const [side,sign]of [['Left',1],['Right',-1]]){
   limb(side,'leg',V(sign*.16,.15,.12*sign*wave),V(sign*.24,.48,.32),rest[side+'Foot'].wq.clone());
   if(!firing)limb(side,'arm',V(sign*(.32+.06*wave),1.09,.24+sign*.08*wave),V(sign*.43,1.13,.02),Q(-.6,sign*.7).multiply(rest[side+'Hand'].wq));
  }
  if(firing)hands('fire',phase,1.31,.43);
  if(idle)worldQ(bones.Head,Q(0,.3*Math.sin(tau*phase)*idle).multiply(rest.Head.wq));
 }
 function transition(p){
  // Two original transition samples are a crouch and the final prone pose.
  if(p>=1){prone();return;}const t=clamp(p,0,1);
  root(lerp(.67,.24,t),lerp(.6,Math.PI/2-.04,t),0);
  worldQ(bones.Head,Q(.1).multiply(rest.Head.wq));
  for(const [side,sign]of [['Left',1],['Right',-1]]){
   limb(side,'leg',V(sign*.20,.12,lerp(-.15,-.70,t)),V(sign*.30,.25,.34),Q(t*Math.PI/2).multiply(rest[side+'Foot'].wq));
   limb(side,'arm',V(sign*.25,lerp(.25,.13,t),lerp(.38,.59,t)),V(sign*.48,.25,.20),Q(-Math.PI/2).multiply(rest[side+'Hand'].wq));
  }
 }
 function death(p,variant,wet){
  const t=clamp((p-.18)/.58,0,1),ease=t*t*(3-2*t),pitch=variant===1?-Math.PI/2:Math.PI/2;
  const sink=wet?.65*clamp((p-.82)/.18,0,1):0;
  root(lerp(.93,wet?.82:.19,ease)-sink,pitch*ease,0,variant===2?.4*ease:0);
  for(const [side,sign]of [['Left',1],['Right',-1]]){
   const q=Q(pitch*ease).multiply(rest[side+'Hand'].wq);const target=V(sign*lerp(.5,.35,ease),lerp(1.25,wet?.9:.17,ease)-sink,lerp(.1,pitch>0?.5:-.5,ease));
   limb(side,'arm',target,V(sign*.6,.3,0),q);
  }
 }
 function pose(name,phase){
  reset();const p=clamp(phase,0,.999999),wave=Math.sin(tau*p);
  if(name==='walk'||name==='panic'){
   mixer.setTime(p*running.duration);scene.updateMatrixWorld(true);
   // Keep the actual alternating Meshy gait, but lower the exaggerated armed sprint.
   for(const[side,sign]of [['Left',1],['Right',-1]])limb(side,'arm',V(sign*.22,1.10,.13-sign*.15*wave),V(sign*.32,.99,-.09),Q(-.45).multiply(rest[side+'Hand'].wq));
  }else if(name==='crawl'||name==='prone'||name==='fireprone'||name==='swim')prone(p,name==='crawl',name==='fireprone',name==='swim');
  else if(name==='down'||name==='up')transition(name==='down'?p:1-p);
  else if(name==='fireup')hands('fire',p);
  else if(['tread','wetattack','wetidle1','wetidle2'].includes(name))tread(p,name==='wetattack',name==='wetidle1'?1:name==='wetidle2'?-1:0);
  else if(['die1','die2','wetdie1','wetdie2'].includes(name))death(p,name.endsWith('1')?1:2,name.startsWith('wet'));
  else if(name==='paradrop'||name==='cheer'){
   const sides=name==='paradrop'?['Left','Right']:['Right'];
   for(const side of sides){const sign=side==='Left'?1:-1;limb(side,'arm',V(sign*.27,1.73,.12+(name==='cheer'?.06*wave:0)),V(sign*.48,1.52,.08),Q(-Math.PI).multiply(rest[side+'Hand'].wq));}
  }else if(name==='idle1'||name==='idle2'){
   hands('ready',p);worldQ(bones.Head,Q(0,.35*wave).multiply(rest.Head.wq));
   const side=name==='idle1'?'Left':'Right',sign=side==='Left'?1:-1;
   limb(side,'arm',V(sign*.15,1.06+.06*Math.sin(Math.PI*p),.20),V(sign*.36,1.02,-.02),Q(-.8,sign*.3).multiply(rest[side+'Hand'].wq));
  }else hands('ready',p);
  scene.updateMatrixWorld(true);return bones;
 }
 return {pose,bones,rest};
}
