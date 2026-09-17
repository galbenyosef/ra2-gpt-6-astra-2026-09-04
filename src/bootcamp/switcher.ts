/** Own one lazy model layer per battle; switching never pauses, steps, or replaces the simulation. */
import type {BattlefieldRenderer} from '../renderer';
import type {ModelLayer} from './model-layer.js';
import {registerTranslations, localizeElement} from '../i18n';
registerTranslations({
 '渲染器':'Renderer', '正在加载 3D 模型，仍可操作 2D 战场。':'Loading 3D models. The 2D battlefield remains playable.',
 '3D 加载失败，已继续使用 2D。可重试。':'3D failed to load. Continuing in 2D. You can retry.',
 '3D：地形与真实模型，可旋转视角':'3D: terrain and authored models with a rotating camera',
 '2D：传统原版画面':'2D: classic original graphics',
 '视角':'Camera','等距':'Isometric','透视':'Perspective','俯视':'Top view',
 '左转 45°':'Rotate left 45°','右转 45°':'Rotate right 45°','重置视角':'Reset camera',
 'Alt + 左键拖动旋转 · 中键平移 · 滚轮缩放':'Alt + left drag to orbit · middle drag to pan · wheel to zoom',
});
export function mountRendererSwitch(root:HTMLElement, view:BattlefieldRenderer):()=>void {
 const controls=document.createElement('fieldset');controls.className='renderer-switch';controls.dataset.testid='renderer-switch';
 controls.innerHTML=`<legend>渲染器</legend><button type="button" data-testid="renderer-2d" aria-pressed="true">2D</button><button type="button" data-testid="renderer-3d" aria-pressed="false">3D</button><p role="status" data-testid="renderer-status"></p>`;
 root.prepend(controls);
 const cameraControls=document.createElement('div');cameraControls.className='bootcamp-camera';cameraControls.dataset.testid='camera-controls';cameraControls.hidden=true;
 cameraControls.innerHTML=`<div><label>视角 <select data-testid="camera-preset"><option value="isometric">等距</option><option value="perspective">透视</option><option value="top">俯视</option></select></label><button type="button" data-testid="camera-left">左转 45°</button><button type="button" data-testid="camera-right">右转 45°</button><button type="button" data-testid="camera-reset">重置视角</button></div><small>Alt + 左键拖动旋转 · 中键平移 · 滚轮缩放</small>`;
 view.canvas.parentElement!.append(cameraControls);
 const preset=cameraControls.querySelector<HTMLSelectElement>('select')!;
 for(const type of ['keydown','keyup','pointerdown'])cameraControls.addEventListener(type,event=>event.stopPropagation());
 preset.onchange=()=>{if(layer){layer.rig.setPreset(preset.value);view.draw();}};
 cameraControls.querySelector<HTMLButtonElement>('[data-testid="camera-left"]')!.onclick=()=>{layer?.rig.rotate(-Math.PI/4);view.draw();};
 cameraControls.querySelector<HTMLButtonElement>('[data-testid="camera-right"]')!.onclick=()=>{layer?.rig.rotate(Math.PI/4);view.draw();};
 cameraControls.querySelector<HTMLButtonElement>('[data-testid="camera-reset"]')!.onclick=()=>{layer?.rig.reset();preset.value='isometric';view.draw();};
 const two=controls.querySelector<HTMLButtonElement>('[data-testid="renderer-2d"]')!,three=controls.querySelector<HTMLButtonElement>('[data-testid="renderer-3d"]')!,status=controls.querySelector('p')!;
 let layer:ModelLayer|undefined,controller:AbortController|undefined,disposed=false,desired='2d',pending:Promise<void>|undefined;
 const show=(mode:'2d'|'3d',message:string)=>{
   view.modelLayer=mode==='3d'?layer:undefined;
   cameraControls.hidden=mode!=='3d';localizeElement(cameraControls);
   view.canvas.dataset.renderer=mode;two.setAttribute('aria-pressed',String(mode==='2d'));three.setAttribute('aria-pressed',String(mode==='3d'));status.textContent=message;localizeElement(controls);view.draw();
 };
 const failure=()=>{if(disposed)return;desired='2d';view.modelLayer=undefined;layer?.dispose();layer=undefined;show('2d','3D 加载失败，已继续使用 2D。可重试。');};
 two.onclick=()=>{desired='2d';show('2d','2D：传统原版画面');};
 three.onclick=()=>{
   desired='3d';
   if(layer){show('3d','3D：地形与真实模型，可旋转视角');return;}
   status.textContent='正在加载 3D 模型，仍可操作 2D 战场。';localizeElement(controls);
   if(pending)return;
   controller=new AbortController();const signal=controller.signal;
   pending=(async()=>{
     try {
       const {ModelLayer}=await import('./model-layer.js');
       if(signal.aborted)return;
       const loaded=await ModelLayer.load(failure,signal);
       if(disposed||signal.aborted){loaded.dispose();return;}
       layer=loaded;preset.value=layer.rig.preset;if(desired==='3d')show('3d','3D：地形与真实模型，可旋转视角');
     } catch(error){if(!disposed && !signal.aborted)failure();}
     finally{pending=undefined;}
   })();
 };
 show('2d','2D：传统原版画面');
 return ()=>{disposed=true;controller?.abort();view.modelLayer=undefined;layer?.dispose();layer=undefined;controls.remove();cameraControls.remove();};
}
