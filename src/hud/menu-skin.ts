/** Loads only locally prepared UI images; the entry menu also works before preparation. */
import { appUrl } from '../urls';
import './menus.css';
import './fonts/fonts.css';
import menuAssets from '../../scripts/assets/menu-assets.json';
import './menu-entry.css';

export async function loadMenuSkin() {
  try {
    const response=await fetch(appUrl('/assets/manifest.json'));
    if(!response.ok)return;
    const {ui,menuVideo}=await response.json();
    const names=['mnscrnl',...Object.keys(menuAssets)];
    if(names.some(name=>!ui?.[name]?.src))return;
    const images=await Promise.all(names.map(async name=>{
      const image=new Image();image.src=appUrl(ui[name].src);await image.decode();return [name,image.src];
    }));
    for(const [name,src] of images)document.documentElement.style.setProperty(`--ui-${name}`,`url("${src}")`);
    document.documentElement.dataset.nativeMenu='true';
    return menuVideo?.src?appUrl(menuVideo.src):undefined;
  } catch { /* Unprepared/offline first entry retains the accessible CSS shell. */ }
}
