/** A name-only, delayed world tooltip; the renderer's visibility-aware picking owns disclosure. */
import type { BattlefieldRenderer } from '../renderer';
import { getDefinition } from '../game';
import { t } from '../i18n';
export class EntityTooltip {
  private element=document.createElement('div');
  private hovered?:number;
  private since=0;
  constructor(canvas:HTMLCanvasElement) {
    this.element.className='entity-tooltip';this.element.hidden=true;this.element.setAttribute('role','tooltip');canvas.parentElement!.append(this.element);
  }
  reset(){this.since=performance.now();this.element.hidden=true;}
  update(renderer:BattlefieldRenderer,dragging:boolean) {
    const {mouse,game}=renderer;
    const entity=mouse.inside&&!dragging&&!game.paused&&!renderer.placement?renderer.pick(mouse.x,mouse.y):undefined;
    if(entity?.id!==this.hovered){this.hovered=entity?.id;this.reset();}
    if(!entity||entity.hp<=0||entity.transportedBy||!game.visible(renderer.localId,entity.x,entity.y)){this.element.hidden=true;return;}
    if(performance.now()-this.since<800)return;
    this.element.textContent=t(getDefinition(entity.type).name);this.element.hidden=false;
    this.element.style.left=Math.max(0,Math.min(mouse.x+15,renderer.width-this.element.offsetWidth-4))+'px';
    this.element.style.top=Math.max(0,Math.min(mouse.y+22,renderer.height-this.element.offsetHeight-4))+'px';
  }
  destroy(){this.element.remove();}
}
