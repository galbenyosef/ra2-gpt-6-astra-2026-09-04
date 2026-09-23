import type { EngineSnapshot } from './game/snapshot';
import type { SavedMap } from './save-game';
import { PLAYER_COLORS } from './game/data';

export interface SaveOverview { width: number; height: number; pixels: number[] }
const WIDTH = 160, HEIGHT = 100, BACKGROUND = 0x07130e;
const COLORS: Record<string, number> = { water: 0x153f57, snow: 0xb9cbcf, land: 0x797c50,
  ore: 0xc6a551, gem: 0xaa7c9d, cliff: 0x7f9396, road: 0x778384, bridge: 0xb3a185 };

/** The overview uses saved terrain and visibility without loading artwork or advancing the match. */
export function createSaveOverview(map: SavedMap, engine: EngineSnapshot): SaveOverview {
  const pixels = Array<number>(WIDTH * HEIGHT).fill(BACKGROUND);
  const overview = { width: WIDTH, height: HEIGHT, pixels };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    if (map.cells[y * map.width + x] === 'void') continue;
    minX = Math.min(minX, x - y); maxX = Math.max(maxX, x - y);
    minY = Math.min(minY, (x + y) / 2); maxY = Math.max(maxY, (x + y) / 2);
  }
  if (!Number.isFinite(minX)) return overview;
  const scale = Math.min((WIDTH - 8) / (maxX - minX + 2), (HEIGHT - 8) / (maxY - minY + 1));
  const ox = (WIDTH - (minX + maxX) * scale) / 2, oy = (HEIGHT - (minY + maxY) * scale) / 2;
  const player = engine.players.find(player => player.id === engine.localPlayerId)!;
  const revealed = !engine.fogOfWar || engine.debugRevealPlayers.includes(engine.localPlayerId);
  const indexAt = (x: number, y: number) => x < 0 || y < 0 || x >= map.width || y >= map.height ? -1 : y * map.width + x;
  for (let py = 0; py < HEIGHT; py++) for (let px = 0; px < WIDTH; px++) {
    const u = (px + .5 - ox) / scale, v = (py + .5 - oy) / scale;
    const i = indexAt(Math.round(v + u / 2), Math.round(v - u / 2));
    if (i < 0 || map.cells[i] === 'void') continue;
    let terrain = map.cells[i];
    const depleted = ['ore','gem'].includes(terrain) && engine.ore[i] <= 0;
    if (depleted) terrain = map.theater === 'snow' ? 'snow' : 'land';
    let color = (!depleted && map.radarColors?.[i]) || COLORS[terrain] || COLORS.land;
    if (!revealed && !player.explored[i]) color = 0x020a08;
    else if (!revealed && !player.fog[i]) color = Math.floor((color >> 16 & 255) * .55) << 16
      | Math.floor((color >> 8 & 255) * .55) << 8 | Math.floor((color & 255) * .55);
    pixels[py * WIDTH + px] = color;
  }
  for (const entity of engine.entities) {
    const i = indexAt(Math.floor(entity.x), Math.floor(entity.y));
    if (entity.hp <= 0 || entity.transportedBy || i < 0 || map.cells[i] === 'void' || !revealed && !player.fog[i]) continue;
    const raw = (engine.players.find(player => player.id === entity.owner)?.color || PLAYER_COLORS[entity.owner] || '#a6aaa0').slice(1);
    const color = Number.parseInt(raw.length === 3 ? [...raw].map(char => char + char).join('') : raw.slice(0, 6), 16);
    const x = Math.round((entity.x - entity.y) * scale + ox), y = Math.round((entity.x + entity.y) / 2 * scale + oy);
    const radius = entity.kind === 'building' ? 2 : 1;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++)
      if (x + dx >= 0 && x + dx < WIDTH && y + dy >= 0 && y + dy < HEIGHT) pixels[(y + dy) * WIDTH + x + dx] = color;
  }
  return overview;
}
