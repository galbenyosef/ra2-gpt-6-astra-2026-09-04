/** Production cards retain engine availability, queue and cancellation semantics.
 * This cohesive render/bind/update pass stays together despite exceeding 5KB. */
import type { Assets, Sprite } from '../assets';
import { CATALOG, type GameEngine, type ProductionCategory } from '../game';
import { bootcampTypes } from '../bootcamp/catalog.js';
import { getLocale, localizeElement, t } from '../i18n';
import { clockFrame, setSprite } from './skin';

const escape = (value:unknown) => String(value).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]!));
interface ProductionView {
  game:GameEngine; assets:Assets; category:ProductionCategory; superweapons:boolean; clock:Sprite;
  onBuild(id:string):void; onReady(id:string):void; onCancel(category:ProductionCategory):void;
}
export function renderProduction(view:ProductionView, previous:string):string {
  const {game,assets,category,clock}=view,p=game.players[0];
  const list=document.querySelector<HTMLElement>('#build-list')!;
  if(list.querySelector('.build-item:active'))return previous;
  const detail=document.querySelector<HTMLElement>('#build-detail')!;
  const all=Object.values(CATALOG).filter(d=>!d.neutral&&(category==='vehicle'?['vehicle','aircraft','naval'].includes(d.category):d.category===category)&&(game.bootcamp?bootcampTypes.has(d.id):(d.faction===p.faction||d.faction==='both')&&(!d.country||d.country===p.country)&&!d.id.includes('construction_yard')));
  const hasYard=game.entities.some(e=>e.owner===0&&e.type.includes('construction_yard')&&e.hp>0);
  if(!game.bootcamp&&!hasYard&&(category==='structure'||category==='defense')) {
    if(previous!=='no-yard'+getLocale())list.innerHTML=`<div class="empty-production"><strong>${t('等待基地部署')}</strong><p>${t('选中基地车')}<br>${t('双击或按 D 展开')}</p></div>`;
    detail.hidden=true;return 'no-yard'+getLocale();
  }
  const unlocked=new Set(game.getAvailable(0).map(d=>d.id));
  const visible=all.filter(d=>unlocked.has(d.id)||p.queues[d.category].some(q=>q.type===d.id)||d.category==='structure'||d.category==='defense').filter(d=>view.superweapons||!['chronosphere','weather_control','iron_curtain','nuclear_silo'].includes(d.id));
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
    if(!visible.length)list.innerHTML=`<div class="empty-production">${game.bootcamp?t('该分类尚无已验证的 3D 模型。'):t('尚无生产设施')}<p>${game.bootcamp?'':t('先在建筑页建造对应的兵营、战车工厂或船坞。')}</p></div>`;
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
