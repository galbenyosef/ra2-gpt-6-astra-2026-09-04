/** Original bottom command icons wired to the shared simulation and control groups. */
import type { Assets, Sprite } from '../assets';
import type { GameEngine } from '../game';
import type { BattlefieldRenderer } from '../renderer';
import { registerTranslations, t } from '../i18n';
import { framePosition, setSprite, type Faction } from './skin';
import './command-bar.css';
registerTranslations({'作战命令':'Battle commands','路径规划（Z）':'Waypoint mode (Z)','选择同类单位（T）':'Select type (T)','停止（S）':'Stop (S)','天蓝色':'Sky blue',
  '编队 1（Ctrl/⌘ + 点击编组）':'Team 1 (Ctrl/⌘ + click to assign)','编队 2（Ctrl/⌘ + 点击编组）':'Team 2 (Ctrl/⌘ + click to assign)','编队 3（Ctrl/⌘ + 点击编组）':'Team 3 (Ctrl/⌘ + click to assign)'});
export function selectType(game:GameEngine,renderer:BattlefieldRenderer) {
  const types=new Set(game.entities.filter(e=>renderer.selection.has(e.id)).map(e=>e.type));
  renderer.setSelection(game.entities.filter(e=>{const p=renderer.toScreen(e.x,e.y);return e.owner===0&&e.hp>0&&!e.transportedBy&&types.has(e.type)&&p.x>=0&&p.x<renderer.width&&p.y>=0&&p.y<renderer.height;}).map(e=>e.id));
}
export function mountCommandBar(root:HTMLElement,assets:Assets,faction:Faction,game:GameEngine,renderer:BattlefieldRenderer,groups:Map<string,number[]>,deploy:()=>void) {
  const commands=[['team1','button00','编队 1（Ctrl/⌘ + 点击编组）'],['team2','button01','编队 2（Ctrl/⌘ + 点击编组）'],['team3','button02','编队 3（Ctrl/⌘ + 点击编组）'],['type','button03','选择同类单位（T）'],['deploy','button04','部署选中单位（D）'],['stop','button08','停止（S）'],['waypoint','button09','路径规划（Z）']];
  for(const [id,icon,label] of commands) {
    const button=document.createElement('button');button.dataset.command=id;button.title=t(label);button.setAttribute('aria-label',t(label));
    const sprite=assets.manifest.ui![`${faction==='allied'?'sidec01':'sidec02'}-${icon}`] as Sprite;
    setSprite(button,sprite);
    button.onpointerdown=()=>button.style.backgroundPosition=framePosition(sprite,1);
    button.onpointerup=button.onpointerleave=()=>button.style.backgroundPosition=framePosition(sprite,0);
    button.onclick=event=>{
      if(id.startsWith('team')) {
        const key=id.slice(4);
        if(event.ctrlKey||event.metaKey)groups.set(key,[...renderer.selection]);
        else renderer.setSelection((groups.get(key)||[]).filter(id=>game.entities.some(e=>e.id===id&&e.owner===0&&e.hp>0&&!e.transportedBy)));
      } else if(id==='type')selectType(game,renderer);
      else if(id==='deploy')deploy();
      else if(id==='stop')game.commandStop([...renderer.selection]);
      else renderer.planningMode=!renderer.planningMode;
      updateCommandBar(root,game,renderer,groups);renderer.canvas.focus();
    };
    root.append(button);
  }
}
export function updateCommandBar(root:HTMLElement,game:GameEngine,renderer:BattlefieldRenderer,groups:Map<string,number[]>) {
  root.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button=>{
    const id=button.dataset.command!;
    if(id.startsWith('team')) {
      const live=(groups.get(id.slice(4))||[]).filter(id=>game.entities.some(e=>e.id===id&&e.owner===0&&e.hp>0&&!e.transportedBy));
      button.classList.toggle('assigned',live.length>0);
      button.setAttribute('aria-pressed',String(live.length>0&&live.length===renderer.selection.size&&live.every(id=>renderer.selection.has(id))));
    } else if(id==='waypoint')button.setAttribute('aria-pressed',String(renderer.planningMode));
    else button.disabled=renderer.selection.size===0;
  });
}
