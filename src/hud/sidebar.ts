/** Composes native faction chrome; observes height without scaling any source pixels.
 * Kept together above 5KB to own one DOM tree, ResizeObserver and its cleanup. */
import type { Assets, Sprite } from '../assets';
import type { GameEngine, ProductionCategory } from '../game';
import { getLocale, registerTranslations, t } from '../i18n';
import { framePosition, setSprite, sidebarLayout, skinOffsets, type Faction } from './skin';
import './sidebar.css';

registerTranslations({'关系':'Relationship','友方':'Allied','敌方':'Enemy','外交与战况':'Diplomacy and status','上一页':'Previous page','下一页':'Next page','电力：产出':'Power: output','消耗':'drain'});
export const sidebarMarkup = `<aside class="ra2-sidebar" data-testid="production-sidebar">
  <div class="ra2-part" data-skin="credits"><span id="money"></span></div>
  <div class="ra2-part" data-skin="top"></div>
  <div class="ra2-part ra2-radar" data-skin="radar"><canvas id="radar" aria-label="战场雷达"></canvas></div>
  <div class="ra2-part" data-skin="side1"></div><div class="ra2-repeat"></div>
  <div class="ra2-part" data-skin="side3"></div><div class="ra2-part" data-skin="addon"></div>
  <button class="ra2-icon" data-skin="diplobtn" id="sidebar-status" title="外交与战况" aria-label="外交与战况" data-testid="sidebar-status"></button>
  <button class="ra2-icon" data-skin="optbtn" id="game-options" title="选项" aria-label="选项" data-testid="sidebar-options"></button>
  <button class="ra2-icon" data-skin="repair" id="repair" title="修理建筑" aria-label="修理建筑" aria-pressed="false" data-testid="sidebar-repair"></button>
  <button class="ra2-icon" data-skin="sell" id="sell" title="出售建筑" aria-label="出售建筑" aria-pressed="false" data-testid="sidebar-sell"></button>
  <nav class="ra2-tabs" aria-label="建造分类">${(['structure','defense','infantry','vehicle'] as const).map((category,i) =>
    `<button class="ra2-icon" data-skin="tab0${i}" data-category="${category}" data-testid="production-tab" aria-pressed="${i===0}" title="${['建筑','防御','步兵','战车 / 飞机 / 舰艇'][i]}" aria-label="${['建筑','防御','步兵','战车 / 飞机 / 舰艇'][i]}"></button>`).join('')}</nav>
  <div class="ra2-power" id="power-bar" role="img"><div class="ra2-pips"></div></div>
  <div class="build-list" id="build-list" data-testid="production-list"></div>
  <button class="ra2-icon" data-skin="r-dn" id="production-next" title="下一页" aria-label="下一页" data-testid="production-next"></button>
  <button class="ra2-icon" data-skin="r-up" id="production-previous" title="上一页" aria-label="上一页" data-testid="production-previous"></button>
  <div class="build-detail" id="build-detail" role="tooltip" hidden></div>
</aside>`;

export class Sidebar {
  readonly ui: Record<string, Sprite>;
  private observer: ResizeObserver;
  private rows = 1;
  private powerSignature = '';
  private list: HTMLElement;
  constructor(private root: HTMLElement, assets: Assets, private faction: Faction) {
    const prefix = faction === 'soviet' ? 'sidec02' : 'sidec01';
    this.ui = Object.fromEntries(Object.entries(assets.manifest.ui || {}).filter(([k]) => k.startsWith(prefix+'-')).map(([k,v])=>[k.slice(8),v as Sprite]));
    root.dataset.faction = faction;
    root.style.width = `${this.ui.credits.frameWidth}px`;
    root.querySelectorAll<HTMLElement>('[data-skin]').forEach(el => {
      const sprite = this.ui[el.dataset.skin!];setSprite(el, sprite);
      el.style.setProperty('--pressed-frame', framePosition(sprite, 1));
      el.style.setProperty('--disabled-frame', framePosition(sprite, 2));
      el.style.setProperty('--ready-frame', framePosition(sprite, 3));
    });
    const repeat = root.querySelector<HTMLElement>('.ra2-repeat')!;
    repeat.style.backgroundImage = `url("${this.ui.side2.src}"),url("${this.ui.side2b.src}")`;
    this.list = root.querySelector('#build-list')!;
    const previous = root.querySelector<HTMLButtonElement>('#production-previous')!;
    const next = root.querySelector<HTMLButtonElement>('#production-next')!;
    previous.onclick = () => this.scroll(-1);next.onclick = () => this.scroll(1);
    this.list.onscroll = () => this.updateScroll();
    this.observer = new ResizeObserver(() => this.layout());this.observer.observe(root);this.layout();
  }
  private at(selector:string, x:number, y:number) {
    const el=this.root.querySelector<HTMLElement>(selector)!;
    el.style.insetInlineStart=`${x}px`;el.style.insetBlockStart=`${y}px`;return el;
  }
  private layout() {
    const {ui,root}=this, o=skinOffsets[this.faction], l=sidebarLayout(root.clientHeight,ui);
    this.rows=l.rows;root.dataset.rows=String(l.rows);
    this.at('[data-skin=top]',0,ui.credits.frameHeight);
    this.at('[data-skin=radar]',0,l.radarY);this.at('[data-skin=side1]',0,l.toolsY);
    this.at('[data-skin=side3]',0,l.bottomY);this.at('[data-skin=addon]',0,l.bottomY+ui.side3.frameHeight);
    this.at('[data-skin=diplobtn]',o.topX,ui.credits.frameHeight+o.topY);
    this.at('[data-skin=optbtn]',o.topX+ui.diplobtn.frameWidth,ui.credits.frameHeight+o.topY);
    this.at('#repair',o.toolX,l.toolsY+o.toolY);this.at('#sell',o.toolX+ui.repair.frameWidth,l.toolsY+o.toolY);
    this.at('.ra2-tabs',o.tabX,l.cardsY-ui.tab00.frameHeight+o.tabY).style.gap=`${o.tabGap}px`;
    this.at('.ra2-repeat',0,l.cardsY).style.height=`${l.rows*l.rowHeight}px`;
    this.at('#build-list',22,l.cardsY+1).style.height=`${l.rows*l.rowHeight-2}px`;
    this.at('#power-bar',o.powerX,l.cardsY).style.height=`${l.rows*l.rowHeight+o.powerY}px`;
    this.at('#production-next',38,l.bottomY+7);this.at('#production-previous',38+ui['r-dn'].frameWidth,l.bottomY+7);
    this.powerSignature='';this.updateScroll();
  }
  refresh() { this.updateScroll(); }
  resetScroll() { this.list.scrollTop=0; }
  private scroll(direction:number) { this.list.scrollTop+=direction*this.rows*this.ui.side2.frameHeight; }
  private updateScroll() {
    this.root.querySelector<HTMLButtonElement>('#production-previous')!.disabled=this.list.scrollTop<1;
    this.root.querySelector<HTMLButtonElement>('#production-next')!.disabled=this.list.scrollTop+this.list.clientHeight>=this.list.scrollHeight-1;
  }
  update(game:GameEngine, category:ProductionCategory, tool:string) {
    const player=game.players[0];
    this.root.querySelector('#money')!.textContent=Math.floor(player.credits).toLocaleString(getLocale());
    for(const name of ['repair','sell'])this.root.querySelector(`#${name}`)!.setAttribute('aria-pressed',String(tool===name));
    this.root.querySelectorAll<HTMLElement>('[data-category]').forEach(el => {
      const tab=el.dataset.category;
      el.setAttribute('aria-pressed',String(category===tab));
      const categories = tab==='vehicle'?['vehicle','aircraft','naval']:[tab!];
      const ready = categories.some(c=>player.queues[c as ProductionCategory].some(q=>q.ready));
      el.classList.toggle('has-ready',ready && category!==tab);
    });
    const online=game.bootcamp||game.debugRevealMap||player.powerProduced>=player.powerConsumed&&game.entities.some(e=>e.owner===0&&e.hp>0&&['radar','airforce_command'].includes(e.type));
    this.root.querySelector<HTMLElement>('[data-skin=radar]')!.style.backgroundPosition=framePosition(this.ui.radar,online?this.ui.radar.frames-1:0);
    this.root.querySelector<HTMLElement>('#radar')!.style.visibility=online?'visible':'hidden';
    const power=this.root.querySelector<HTMLElement>('#power-bar')!;
    power.style.width=`${this.ui.powerp.frameWidth}px`;
    const label=`${t('电力：产出')} ${player.powerProduced} / ${t('消耗')} ${player.powerConsumed}`;
    power.title=label;power.setAttribute('aria-label',label);
    const signature=`${player.powerProduced}:${player.powerConsumed}:${power.clientHeight}`;
    if(signature===this.powerSignature)return;this.powerSignature=signature;
    const pip=this.ui.powerp, total=Math.max(player.powerProduced,player.powerConsumed);
    const capacity=Math.max(100,total),height=Math.max(0,Math.min(1,(Math.log10((capacity/100+5)/5e7)/(capacity/100+3)+2)/2))*power.clientHeight;
    const used=total?Math.min(1,player.powerConsumed/total):1;
    const reserve=total?Math.min(1,Math.max(0,Math.min(100,player.powerProduced-player.powerConsumed))/total):0;
    const counts=[total?Math.floor(used*height/3):1,Math.floor(reserve*height/3),Math.floor((1-used-reserve)*height/3)];
    const pips=power.firstElementChild as HTMLElement;pips.replaceChildren();
    let y=power.clientHeight-pip.frameHeight;
    // Red consumption, yellow reserve, green spare generation; native 2px pips.
    for(const [i,count] of counts.entries())for(let n=0;n<count;n++) {
      const el=document.createElement('i');setSprite(el,pip,[3,2,1][i]);el.style.insetBlockStart=`${y}px`;pips.append(el);y-=3;
    }
  }
  destroy() { this.observer.disconnect(); }
}
