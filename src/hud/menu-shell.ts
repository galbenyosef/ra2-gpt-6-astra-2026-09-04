/** Original mechanical command rail and a bounded, skippable entry splash. */
import { APP_TITLE } from '../project';
import { registerTranslations } from '../i18n';
import './menu-shell.css';
registerTranslations({'主菜单':'Main Menu','信息与制作人员':'Info & Credits','全屏':'Fullscreen','游戏菜单':'Game Menu','退出游戏':'Quit Game','投降':'Surrender','游戏素材':'Game Files'});
export const fanCredit = '© Victor Zhou 2026: Fan Remake of Command & Conquer: Red Alert 2 by Electronic Arts.';
export const monitorMarkup = `<div class="menu-monitor"><div class="monitor-glass"><div class="radar-sweep" aria-hidden="true"></div><h1 class="rust-logo" aria-label="${APP_TITLE}">${APP_TITLE.split(' ').map(word=>`<span>${word}</span>`).join('')}</h1></div></div>`;
export function railHeader(title:string) { return `<div class="rail-preview"><h2>${title}</h2></div>`; }
export function showEntrySplash() {
  const splash=document.createElement('div');splash.className='entry-splash';splash.setAttribute('aria-label',APP_TITLE);
  splash.innerHTML=`<div class="splash-monitor">${monitorMarkup}</div><footer>${fanCredit}</footer>`;
  const app=document.querySelector<HTMLElement>('#app');if(app)app.inert=true;
  document.body.append(splash);
  const dismiss=()=>{splash.remove();if(app)app.inert=false;clearTimeout(timer);document.removeEventListener('keydown',skip);};
  const skip=(event:KeyboardEvent)=>{if(['Escape','Enter',' '].includes(event.key)){event.preventDefault();dismiss();}};
  const timer=window.setTimeout(dismiss,3000);
  splash.addEventListener('pointerdown',dismiss,{once:true});document.addEventListener('keydown',skip);
}
