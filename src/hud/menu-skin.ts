/** Loads only locally prepared UI images; the entry menu also works before preparation. */
import { appUrl } from '../urls';
import './menus.css';
import './menu-entry.css';

export async function loadMenuSkin() {
  try {
    const response=await fetch(appUrl('/assets/manifest.json'));
    if(!response.ok)return;
    const {ui}=await response.json();
    const names=['mnscrnl','pudlgbgn','mnbttn','cue_i','cce_i'];
    if(names.some(name=>!ui?.[name]?.src))return;
    const images=await Promise.all(names.map(async name=>{
      const image=new Image();image.src=appUrl(ui[name].src);await image.decode();return [name,image.src];
    }));
    for(const [name,src] of images)document.documentElement.style.setProperty(`--ui-${name}`,`url("${src}")`);
    document.documentElement.dataset.nativeMenu='true';
  } catch { /* Unprepared/offline first entry retains the accessible CSS shell. */ }
}
