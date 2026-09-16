// Inspector state, frame stepping and automatic touring share one closure; kept together above 5 KB.
import type {Sprite} from '@game/assets';
import type {Entity} from '@game/game/types';
import type {BattlefieldRenderer} from '@game/renderer';

/** Inspect the same source frame on a live battlefield actor and its original mirror. */
export function createFrameInspector(renderer:BattlefieldRenderer,source:()=>Entity,original:Sprite){
 const action=document.querySelector<HTMLSelectElement>('#frame-action')!,facing=document.querySelector<HTMLSelectElement>('#frame-facing')!,slider=document.querySelector<HTMLInputElement>('#frame-step')!,play=document.querySelector<HTMLButtonElement>('#frame-play')!,readout=document.querySelector<HTMLElement>('#frame-readout')!;
 const labels:Record<string,string>={ready:'待命',walk:'跑步',fireup:'站姿开枪',crawl:'匍匐',prone:'卧倒待命',fireprone:'卧姿开枪',down:'卧倒',up:'起身',swim:'游泳划水',tread:'踩水',wetattack:'水中开枪',idle1:'待机 1',idle2:'待机 2',die1:'倒地 1',die2:'倒地 2',wetidle1:'水中待机 1',wetidle2:'水中待机 2',wetdie1:'水中倒地 1',wetdie2:'水中倒地 2',paradrop:'伞降姿势',cheer:'欢呼'};
 const hd=renderer.assets.sprite('tany')!,aligned=hd.animationClock==='source'&&(hd.sourceFrames??hd.frames)===original.frames,catalog=aligned?hd:original;
 action.replaceChildren(new Option('自动（游戏状态）','auto'),...Object.keys(labels).filter(k=>catalog.sequences?.[k]).map(k=>new Option(labels[k],k)),new Option('全部原始帧号','all'));
 facing.replaceChildren(...['北','西北','西','西南','南','东南','东','东北'].map((n,i)=>new Option(n,String(i))));
 let playing=false,epoch=0,step=0,time=0,touring=false,tourEpoch=0,pendingTour=new URLSearchParams(location.search).get('tour')==='1';
 const tour=document.querySelector<HTMLButtonElement>('#frame-tour')!,playlist=['swim','tread','wetattack','wetidle1','wetidle2','wetdie1','wetdie2','ready','walk','fireup','idle1','idle2','down','crawl','prone','fireprone','up','die1','die2','paradrop','cheer'];
 const once=()=>['down','up','die1','die2','wetdie1','wetdie2','paradrop'].includes(action.value);
 const stopTour=()=>{touring=false;tour.textContent='轮播全部动作';};
 const count=()=>action.value==='all'?(catalog.sourceFrames??catalog.frames):catalog.sequences?.[action.value]?.[1]||1;
 const rate=()=>count()/(hd.motionSequences?.[action.value]?.duration??count()/12);
 const active=()=>action.value!=='auto';
 const home=new Map<number,{x:number,y:number}>();
 const unmapped=new Set<number>(hd.unmappedFrames||[]);
 const configure=()=>{const actor=source();if(!home.has(actor.id))home.set(actor.id,{x:actor.x,y:actor.y});const wet=action.value==='swim'||action.value==='tread'||action.value.startsWith('wet');const position=wet?{x:18.3,y:11.5}:home.get(actor.id)!;Object.assign(actor,position);actor.path=[];actor.order={kind:'idle'};step=0;slider.max=String(count()-1);slider.value='0';playing=false;play.textContent='循环此动作';if(active()){renderer.setSelection([source().id]);renderer.center(source().x,source().y);renderer.zoom=2;}update(time);};
 action.onchange=()=>{stopTour();configure();};facing.onchange=()=>update(time);
 slider.oninput=()=>{stopTour();playing=false;play.textContent='循环此动作';step=Number(slider.value);update(time);};
 play.onclick=()=>{if(!active())return;stopTour();playing=!playing;epoch=time-step/rate();play.textContent=playing?'停在这一帧':'循环此动作';};
 for(const [id,delta]of [['frame-prev',-1],['frame-next',1]] as const)document.getElementById(id)!.onclick=()=>{stopTour();playing=false;play.textContent='循环此动作';step=(step+delta+count())%count();update(time);};
 function tourAction(name:string){action.value=name;tourEpoch=time;configure();playing=true;epoch=time;play.textContent='停在这一帧';tour.textContent='停止动作轮播';}
 tour.onclick=()=>{if(touring){stopTour();playing=false;play.textContent='循环此动作';}else{touring=true;facing.value='2';tourAction(playlist[0]);}};
 function index(){const seq=catalog.sequences?.[action.value];return action.value==='all'?step:seq?seq[0]+Number(facing.value)*seq[2]+step:0;}
 function update(now:number){time=now;if(pendingTour){pendingTour=false;touring=true;facing.value='2';tourAction(playlist[0]);}
  if(touring&&time-tourEpoch>=Math.max(3,2*(count()/rate()+.75)))tourAction(playlist[(playlist.indexOf(action.value)+1)%playlist.length]);
  if(playing){const duration=count()/rate(),elapsed=Math.max(0,time-epoch)%(duration+(once()?.75:0));step=Math.min(count()-1,Math.floor(elapsed*rate()));}
  slider.value=String(step);readout.textContent=active()?`${touring?'轮播 · ':''}${labels[action.value]||'源帧'} · ${step+1} / ${count()} · 原始帧号 ${index()} · ${aligned&&!unmapped.has(index())?'骨骼烘焙与原版同步':'原版未命名帧参考'}`:'选择动作后，地图中央的谭雅与右侧原版同步逐帧显示';}
 function install(){const previous=renderer.entityPresentation;renderer.entityPresentation=e=>{const view=previous?.(e),actor=source();if(!active()||(e.id!==actor.id&&e.id!==-actor.id-1))return view;return {...view,sprite:e.id<0||!aligned||unmapped.has(index())?original:renderer.assets.sprite('tany'),frame:index(),action:action.value,label:e.id<0?'原版':aligned&&!unmapped.has(index())?'高清骨骼':'原版参考'};};}
 return {install,update,get active(){return active();},get frame(){return index();}};
}
