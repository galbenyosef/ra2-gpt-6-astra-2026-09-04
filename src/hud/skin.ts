/** Native sidebar geometry and atlas frames, shared with conversion readiness checks. */
import required from '../../scripts/assets/sidebar-assets.json';
import type { Sprite } from '../assets';

export type Faction = 'allied' | 'soviet';
export const sidebarAssets = Object.entries(required).flatMap(([name, frames]) =>
  ['sidec01', 'sidec02'].map(side => ({key:`${side}-${name}`, frames})));

export function missingSidebarAssets(ui: Record<string, unknown>): string[] {
  return sidebarAssets.filter(({key,frames}) => {
    const s = ui[key] as Sprite | undefined;
    return !s || s.frames !== frames || !s.frameWidth || !s.frameHeight || !s.columns ||
      s.width !== s.frameWidth * s.columns || s.height !== s.frameHeight * Math.ceil(frames / s.columns);
  }).map(({key}) => key);
}
export const skinOffsets = {
  allied: {topX:12, topY:4, toolX:20, toolY:8, tabX:26, tabY:-3, tabGap:1, powerX:5, powerY:2},
  soviet: {topX:14, topY:5, toolX:34, toolY:7, tabX:20, tabY:-2, tabGap:0, powerX:0, powerY:0},
};
export function sidebarLayout(height: number, ui: Record<string, Sprite>) {
  const radarY = ui.credits.frameHeight + ui.top.frameHeight;
  const toolsY = radarY + ui.radar.frameHeight;
  const cardsY = toolsY + ui.side1.frameHeight;
  const rowHeight = ui.side2.frameHeight;
  const footerHeight = Math.max(ui.side3.frameHeight, 7 + Math.max(ui['r-up'].frameHeight, ui['r-dn'].frameHeight));
  const rows = Math.max(1, Math.floor((height - cardsY - footerHeight) / rowHeight));
  return {radarY, toolsY, cardsY, rows, rowHeight, bottomY:cardsY + rows * rowHeight};
}
export function framePosition(s: Sprite, frame: number): string {
  const i = Math.max(0, Math.min(s.frames - 1, Math.floor(frame)));
  return `${-(i % s.columns) * s.frameWidth}px ${-Math.floor(i / s.columns) * s.frameHeight}px`;
}
export function clockFrame(progress: number, frames: number): number {
  return Math.max(1, Math.ceil(Math.max(0, Math.min(1, progress)) * (frames - 1))) % frames;
}
export function setSprite(element: HTMLElement, sprite: Sprite, frame = 0) {
  element.style.backgroundImage = `url("${sprite.src}")`;
  element.style.backgroundPosition = framePosition(sprite, frame);
  element.style.width = `${sprite.frameWidth}px`;
  element.style.height = `${sprite.frameHeight}px`;
}
