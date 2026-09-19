/** In-match options reuse the modal's pause lifecycle and the live renderer/engine. */
import type { Assets, SoundSystem } from '../assets';
import type { BattlefieldRenderer } from '../renderer';
import { registerTranslations, t } from '../i18n';
import { audioMarkup, bindAudio } from './options-audio';
import './options.css';

registerTranslations({'画面':'Display','控制':'Controls','返回':'Back','画面尺寸':'Screen size','随窗口调整':'Fit window',
  '全屏':'Full screen','切换全屏':'Toggle full screen','边缘滚屏':'Edge scrolling','滚屏速度':'Scroll speed',
  '浏览器未能切换全屏。':'The browser could not change full screen.'});
interface OptionsContext {
  assets:Assets; sound:SoundSystem; renderer:BattlefieldRenderer; speed:number;
  setSpeed(value:number):void; back():void; help():void;
  modal(title:string,body:string,actions:string):HTMLElement;
}
let screenSize='auto';
export function applyScreenSize() {
  const el=document.querySelector<HTMLElement>('.game-screen');if(!el)return;
  const [w,h]=screenSize.split('x').map(Number);
  el.style.width=screenSize==='auto'?'100%':`min(100%, ${w}px)`;
  el.style.height=screenSize==='auto'?'100dvh':`min(100dvh, ${h}px)`;
}
export function showOptions(context:OptionsContext,section='display') {
  const {renderer,sound,assets}=context;
  const body=section==='audio'?audioMarkup(sound,assets):section==='controls'?`
    <div class="option-fields">
      <label class="option-check"><input id="edge-scroll" type="checkbox" ${renderer.edgeScroll?'checked':''}/>边缘滚屏</label>
      <label><span>滚屏速度</span><input id="scroll-speed" type="range" min="25" max="200" step="25" value="${renderer.scrollSpeed*100}" aria-label="滚屏速度"/><output>${renderer.scrollSpeed}×</output></label>
      <button id="keyboard-help">操作说明</button>
    </div>`:`<div class="option-fields">
      <label><span>游戏速度</span><select id="option-speed" aria-label="游戏速度">${[.75,1,1.5,2].map((speed,i)=>`<option value="${speed}" ${speed===context.speed?'selected':''}>${['慢速','正常','快速','最快'][i]} · ${speed}×</option>`).join('')}</select></label>
      <label><span>画面尺寸</span><select id="screen-size" aria-label="画面尺寸">${['auto','1024x768','1280x720','1600x900'].map(size=>`<option value="${size}" ${size===screenSize?'selected':''}>${size==='auto'?'随窗口调整':size.replace('x',' × ')}</option>`).join('')}</select></label>
      <button id="fullscreen">切换全屏</button>
    </div>`;
  const root=context.modal('选项',`<nav class="options-tabs" aria-label="选项">${[['display','画面'],['audio','音效'],['controls','控制']].map(([id,label])=>`<button data-option-section="${id}" aria-pressed="${id===section}">${label}</button>`).join('')}</nav>${body}<p class="options-message" role="status"></p>`,`<button id="options-back">返回</button>`);
  root.querySelector<HTMLButtonElement>('#options-back')!.onclick=context.back;
  root.querySelectorAll<HTMLButtonElement>('[data-option-section]').forEach(b=>b.onclick=()=>{
    showOptions(context,b.dataset.optionSection);
    document.querySelector<HTMLButtonElement>(`[data-option-section="${b.dataset.optionSection}"]`)?.focus();
  });
  if(section==='audio'){bindAudio(root,sound);return;}
  if(section==='controls'){
    root.querySelector<HTMLInputElement>('#edge-scroll')!.onchange=e=>renderer.edgeScroll=(e.target as HTMLInputElement).checked;
    const input=root.querySelector<HTMLInputElement>('#scroll-speed')!;
    input.oninput=()=>{renderer.scrollSpeed=Number(input.value)/100;input.nextElementSibling!.textContent=renderer.scrollSpeed+'×';};
    root.querySelector<HTMLButtonElement>('#keyboard-help')!.onclick=context.help;return;
  }
  root.querySelector<HTMLSelectElement>('#option-speed')!.onchange=e=>{
    context.speed=Number((e.target as HTMLSelectElement).value);context.setSpeed(context.speed);
  };
  root.querySelector<HTMLSelectElement>('#screen-size')!.onchange=e=>{screenSize=(e.target as HTMLSelectElement).value;applyScreenSize();};
  root.querySelector<HTMLButtonElement>('#fullscreen')!.onclick=async()=>{
    try {if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch {root.querySelector('.options-message')!.textContent=t('浏览器未能切换全屏。');}
  };
}
