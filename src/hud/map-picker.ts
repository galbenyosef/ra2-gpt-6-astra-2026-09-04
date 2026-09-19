/** Original engagement selector: game types and map list, preview and commands at right.
 * Kept above 5KB so one owner guards async selection, confirmation and disposal. */
import { listMaps, loadMap, type MapData, type MapDefinition } from '../maps';
import { TRAINING_MAP_ID } from '../bootcamp/training-map';
import { localizeElement, registerTranslations, t } from '../i18n';
import './map-picker.css';

registerTranslations({'地图类型':'Game type','全部':'All','标准作战':'Standard','训练场':'Training','自定义地图':'Custom maps','排序':'Sort','名称':'Name','人数':'Players'});
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
interface PickerContext {
  selected:MapData;
  modal(title:string,body:string,actions:string):HTMLElement;
  preview(canvas:HTMLCanvasElement,map:MapData):void;
  choose(map:MapData):void; cancel():void; upload(input:HTMLInputElement):void;
}
export function openMapPicker(context:PickerContext) {
  let current=context.selected,candidate=current.id,request=0,loading=false,filter='all';
  const maps=listMaps();
  const root=context.modal('选择战场',`<div class="map-browser">
    <div class="map-catalog"><nav class="map-types" aria-label="地图类型"><h3>地图类型</h3>${[['all','全部'],['standard','标准作战'],['megawealth','巨富'],['training','训练场'],['custom','自定义地图']].map(([id,label])=>`<button data-map-filter="${id}" aria-pressed="${id===filter}">${label}</button>`).join('')}</nav>
    <div class="map-choices"><label class="map-sort">排序 <select id="map-sort"><option value="name">名称</option><option value="players">人数</option></select></label><div class="map-list inset" id="map-list" role="listbox" aria-label="选择战场"></div><input id="map-search" class="map-search" placeholder="搜索地图名称…" aria-label="搜索地图"/></div></div>
    <aside class="preview-column"><canvas id="map-modal-preview" class="map-modal-preview"></canvas><h3 id="candidate-name">${escape(current.name)}</h3><p id="candidate-meta">${current.players} 人</p><p id="map-error" role="status"></p></aside>
  </div>`,`<input id="map-file" type="file" accept=".ra2map,.json,.map,.mpr" hidden/><button id="import-map">上传地图</button><button id="map-confirm" class="primary">确认战场</button><button id="map-cancel">取消</button>`);
  root.querySelector('.modal')!.classList.add('map-select-dialog');
  const get=<T extends HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  get('.preview-column').append(get('.modal-actions'));
  const matches=(map:MapDefinition)=>filter==='all'||filter==='training'&&map.id===TRAINING_MAP_ID||filter==='megawealth'&&map.specialMode==='megawealth'||filter==='custom'&&!map.official&&map.id!==TRAINING_MAP_ID||filter==='standard'&&map.official&&!map.specialMode;
  const render=()=>{
    const query=get<HTMLInputElement>('#map-search').value.toLowerCase(),sort=get<HTMLSelectElement>('#map-sort').value;
    const visible=maps.filter(m=>matches(m)&&(m.name+' '+m.nameEn).toLowerCase().includes(query));
    visible.sort((a,b)=>sort==='players'?a.players-b.players:a.nameEn.localeCompare(b.nameEn));
    get('#map-list').innerHTML=visible.map(m=>`<button data-map-id="${escape(m.id)}" role="option" aria-selected="${m.id===candidate}" class="${m.id===candidate?'active':''}"><span>${escape(t(m.name))}</span><span>${m.players}</span></button>`).join('');
    root.querySelectorAll<HTMLButtonElement>('[data-map-id]').forEach(button=>button.onclick=async()=>{
      const token=++request;loading=true;get<HTMLButtonElement>('#map-confirm').disabled=true;get('#map-error').textContent='';
      try {
        const map=await loadMap(button.dataset.mapId!);
        if(token!==request||!root.isConnected)return;
        current=map;candidate=map.id;context.preview(get('#map-modal-preview'),map);
        get('#candidate-name').textContent=t(map.name);get('#candidate-meta').textContent=t(`${map.players} 人`);render();
        root.querySelector<HTMLButtonElement>('[aria-selected=true]')?.focus({preventScroll:true});
      } catch(error){if(token===request&&root.isConnected)get('#map-error').textContent=String(error);}
      finally{if(token===request&&root.isConnected){loading=false;get<HTMLButtonElement>('#map-confirm').disabled=false;}}
    });
  };
  root.querySelectorAll<HTMLButtonElement>('[data-map-filter]').forEach(button=>button.onclick=()=>{
    filter=button.dataset.mapFilter!;root.querySelectorAll('[data-map-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();
  });
  get('#map-list').onkeydown=e=>{
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();
    const buttons=[...root.querySelectorAll<HTMLButtonElement>('[data-map-id]')],index=buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(e.key==='ArrowDown'?1:-1)));
    buttons[next]?.focus();buttons[next]?.click();
  };
  get('#map-search').oninput=render;get('#map-sort').onchange=render;
  get('#map-cancel').onclick=context.cancel;get('#map-confirm').onclick=()=>{if(!loading)context.choose(current);};
  get('#import-map').onclick=()=>get('#map-file').click();get('#map-file').onchange=()=>context.upload(get('#map-file'));
  render();localizeElement(root);context.preview(get('#map-modal-preview'),current);
}
