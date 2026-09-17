/** Own one lazy model layer per battle; switching never pauses, steps, or replaces the simulation. */
import type {BattlefieldRenderer} from '../renderer';
import type {ModelLayer} from './model-layer.js';
import {registerTranslations, localizeElement} from '../i18n';
registerTranslations({
 '渲染器':'Renderer', '正在加载 3D 模型，仍可操作 2D 战场。':'Loading 3D models. The 2D battlefield remains playable.',
 '3D 加载失败，已继续使用 2D。可重试。':'3D failed to load. Continuing in 2D. You can retry.',
 '3D：原版地形与真实模型':'3D: original terrain and authored models',
 '2D：传统原版画面':'2D: classic original graphics',
});
export function mountRendererSwitch(root:HTMLElement, view:BattlefieldRenderer):()=>void {
 const controls=document.createElement('fieldset');controls.className='renderer-switch';controls.dataset.testid='renderer-switch';
 controls.innerHTML=`<legend>渲染器</legend><button type="button" data-testid="renderer-2d" aria-pressed="true">2D</button><button type="button" data-testid="renderer-3d" aria-pressed="false">3D</button><p role="status" data-testid="renderer-status"></p>`;
 root.prepend(controls);
 const two=controls.querySelector<HTMLButtonElement>('[data-testid="renderer-2d"]')!,three=controls.querySelector<HTMLButtonElement>('[data-testid="renderer-3d"]')!,status=controls.querySelector('p')!;
 let layer:ModelLayer|undefined,controller:AbortController|undefined,disposed=false,desired='2d',pending:Promise<void>|undefined;
 const show=(mode:'2d'|'3d',message:string)=>{
   view.modelLayer=mode==='3d'?layer:undefined;
   view.canvas.dataset.renderer=mode;two.setAttribute('aria-pressed',String(mode==='2d'));three.setAttribute('aria-pressed',String(mode==='3d'));status.textContent=message;localizeElement(controls);view.draw();
 };
 const failure=()=>{if(disposed)return;desired='2d';view.modelLayer=undefined;layer?.dispose();layer=undefined;show('2d','3D 加载失败，已继续使用 2D。可重试。');};
 two.onclick=()=>{desired='2d';show('2d','2D：传统原版画面');};
 three.onclick=()=>{
   desired='3d';
   if(layer){show('3d','3D：原版地形与真实模型');return;}
   status.textContent='正在加载 3D 模型，仍可操作 2D 战场。';localizeElement(controls);
   if(pending)return;
   controller=new AbortController();const signal=controller.signal;
   pending=(async()=>{
     try {
       const {ModelLayer}=await import('./model-layer.js');
       if(signal.aborted)return;
       const loaded=await ModelLayer.load(failure,signal);
       if(disposed||signal.aborted){loaded.dispose();return;}
       layer=loaded;if(desired==='3d')show('3d','3D：原版地形与真实模型');
     } catch(error){if(!disposed && !signal.aborted)failure();}
     finally{pending=undefined;}
   })();
 };
 show('2d','2D：传统原版画面');
 return ()=>{disposed=true;controller?.abort();view.modelLayer=undefined;layer?.dispose();layer=undefined;controls.remove();};
}
