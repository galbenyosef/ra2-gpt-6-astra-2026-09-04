/** Production cards retain engine availability, queue and cancellation semantics. */
import type { Assets, Sprite } from '../assets';
import { CATALOG, type GameEngine, type ProductionCategory } from '../game';
import { productionItems } from './availability';
import { getLocale, localizeElement, t } from '../i18n';
import { clockFrame, setSprite } from './skin';

const escape = (value:unknown) => String(value).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]!));
interface ProductionView {
  game:GameEngine; assets:Assets; category:ProductionCategory; clock:Sprite;
  onBuild(id:string):void; onReady(id:string):void; onCancel(category:ProductionCategory):void;
}
export function renderProduction(view:ProductionView, previous:string):string {
  const {game,assets,category,clock}=view,p=game.players[0];
  const list=document.querySelector<HTMLElement>('#build-list')!;
  if(list.querySelector('.build-item:active'))return previous;
  const detail=document.querySelector<HTMLElement>('#build-detail')!;
  const visible=productionItems(game,category);
  const signature=getLocale()+category+visible.map(d=>`${d.id}:${game.canBuild(0,d.id)}:${p.queues[d.category].map(q=>q.type+q.ready).join(',')}`).join('|');
  if(signature!==previous) {
    const focused=(document.activeElement as HTMLElement)?.dataset.build;
    const scroll=list.scrollTop;
    detail.hidden=true;
    list.innerHTML=visible.map(d=>{
      const items=p.queues[d.category].filter(q=>q.type===d.id),ready=items.some(q=>q.ready);
      const can=game.canBuild(0,d.id)||items.length>0;
      const key=d.cameo.replace(/icon$/,''),entry=assets.manifest.cameos?.[key]||assets.manifest.cameos?.[d.sprite];
      const url=typeof entry==='string'?entry:entry?.src;
      return `<button class="build-item ${can?'':'locked'} ${items.length?'queued':''}" data-testid="build-item" data-build="${d.id}" aria-label="${escape(t(d.name))}, $${d.cost}${ready?', '+t('就绪'):''}" aria-disabled="${!can}" aria-describedby="build-detail" title="${escape(t(d.name))} — $${d.cost}\n${escape(t(d.description))}\n${escape(t(game.getBuildReason(0,d.id)))}">${url?`<img src="${url}" alt="" draggable="false"/>`:`<span class="placeholder-cameo">${escape(t(d.name))}</span>`}<span class="progress-mask" hidden></span>${items.length>1?`<span class="queue-count">${items.length}</span>`:''}${ready?`<span class="ready-text">${t('就绪')}</span>`:''}<span class="item-name">${escape(t(d.name))}</span></button>`;
    }).join('');
    list.querySelectorAll<HTMLButtonElement>('[data-build]').forEach(el=>{
      const id=el.dataset.build!,d=CATALOG[id];
      el.onclick=()=>{if(p.queues[d.category].some(q=>q.type===id&&q.ready))view.onReady(id);else view.onBuild(id);};
      el.oncontextmenu=e=>{e.preventDefault();view.onCancel(d.category);};
      const show=()=>{detail.innerHTML=`<strong>${escape(t(d.name))} · $${d.cost}</strong><p>${escape(t(d.description))}</p><p>${escape(t(game.getBuildReason(0,id)))}</p>`;detail.hidden=false;};
      el.onmouseenter=show;el.onfocus=show;
      el.onmouseleave=()=>{detail.hidden=true;};el.onblur=()=>{detail.hidden=true;};
    });
    list.scrollTop=scroll;
    if(focused)list.querySelector<HTMLButtonElement>(`[data-build="${focused}"]`)?.focus({preventScroll:true});
    localizeElement(list);
  }
  list.querySelectorAll<HTMLElement>('[data-build]').forEach(el=>{
    const d=CATALOG[el.dataset.build!],first=p.queues[d.category][0];
    const mask=el.querySelector<HTMLElement>('.progress-mask')!;
    mask.hidden=first?.type!==d.id||first.ready;
    if(!mask.hidden){const frame=clockFrame(first.progress,clock.frames);setSprite(mask,clock,frame);mask.dataset.frame=String(frame);}
  });
  return signature;
}
