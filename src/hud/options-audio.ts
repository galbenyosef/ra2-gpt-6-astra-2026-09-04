/** Audio controls update live channels and retain the selected track while muted. */
import type { Assets, SoundSystem } from '../assets';
import { registerTranslations } from '../i18n';

registerTranslations({'音乐音量':'Music volume','音效音量':'Sound volume','音乐曲目':'Music track','游戏音效':'Game sound'});
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function audioMarkup(sound:SoundSystem, assets:Assets) {
  const music=assets.manifest.music;
  const tracks=music&&typeof music==='object'&&!Array.isArray(music)?Object.keys(music):[];
  return `<div class="option-fields">
    <label class="option-check"><input id="option-sound" type="checkbox" ${sound.enabled?'checked':''}/>游戏音效</label>
    <label><span>音效音量</span><input id="sound-volume" type="range" min="0" max="100" value="${Math.round(sound.volume*100)}" aria-label="音效音量"/><output>${Math.round(sound.volume*100)}%</output></label>
    <label class="option-check"><input id="option-music" type="checkbox" ${sound.musicEnabled?'checked':''}/>原版音乐</label>
    <label><span>音乐音量</span><input id="music-volume" type="range" min="0" max="100" value="${Math.round(sound.musicVolume*100)}" aria-label="音乐音量"/><output>${Math.round(sound.musicVolume*100)}%</output></label>
    ${tracks.length?`<label><span>音乐曲目</span><select id="music-track" aria-label="音乐曲目">${tracks.map(key=>`<option value="${escape(key)}" ${key===sound.musicTrack?'selected':''}>${escape(key==='hm2'?'Hell March 2':key.replace(/_/g,' '))}</option>`).join('')}</select></label>`:''}
  </div>`;
}
export function bindAudio(root:HTMLElement,sound:SoundSystem) {
  root.querySelector<HTMLInputElement>('#option-sound')!.onchange=e=>sound.setEnabled((e.target as HTMLInputElement).checked);
  root.querySelector<HTMLInputElement>('#option-music')!.onchange=e=>sound.setMusic((e.target as HTMLInputElement).checked);
  for(const channel of ['sound','music'] as const) {
    const input=root.querySelector<HTMLInputElement>(`#${channel}-volume`)!;
    input.oninput=()=>{sound.setVolume(channel,Number(input.value)/100);input.nextElementSibling!.textContent=input.value+'%';};
  }
  const track=root.querySelector<HTMLSelectElement>('#music-track');
  if(track)track.onchange=()=>sound.setMusic(sound.musicEnabled,track.value);
}
