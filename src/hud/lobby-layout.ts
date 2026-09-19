/** Original skirmish arrangement: compact player/options panel and right command rail. */
import './lobby.css';

export function layoutLobby(root:HTMLElement) {
  root.classList.add('skirmish-lobby');
  const get=(selector:string)=>root.querySelector<HTMLElement>(selector)!;
  const panel=get('.settings-panel'),rail=document.createElement('aside');
  rail.className='lobby-rail';
  const title=document.createElement('h2');title.textContent=get('.brand-caption strong').textContent;
  get('.brand-caption').remove();
  const map=get('.map-panel');map.querySelector('.panel-title')?.remove();
  const choose=get('#choose-map'),start=get('#start'),back=get('#mode-back');
  const actions=document.createElement('nav');actions.className='lobby-commands';
  actions.append(choose,start,back);rail.append(title,map,actions);
  const options=document.createElement('div');options.className='lobby-rules';
  options.append(get('.checks'),get('.lobby-options'));panel.append(options,get('.map-sharing-bar'));
  get('.lobby-bottom').remove();get('.lobby').replaceChildren(panel,rail);
}
