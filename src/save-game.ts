import type { GameEngine } from './game/engine';
import type { RenderMap } from './renderer';
import type { ProductionCategory } from './game/types';
import { CATEGORIES } from './game/data';
import { copySaveData, stringifySaveData, type EngineSnapshot } from './game/snapshot';
import { checkSaveTree, finite, integer, list, point, record, requireSave, textValue, validateEngineSnapshot, validateGameMap } from './game/snapshot-validation';

export const MAX_SAVE_BYTES = 32 * 1024 * 1024;
export interface SavedView {
  camera: { x: number; y: number }; zoom: number;
  selection: number[]; groups: [string, number[]][]; category: ProductionCategory;
}
export type SavedMap = RenderMap & { originalSize?: number[]; localSize?: number[]; origin?: { x: number; y: number }; nameEn?: string };
export interface SaveGame {
  format: 'rustalarm-save'; schemaVersion: 1; simulationVersion: 1;
  name: string; savedAt: string; map: SavedMap; engine: EngineSnapshot; view: SavedView;
}

function captureMap(map: SavedMap): SavedMap {
  const { width, height, cells, spawns, id, name, theater, layout, resolvedTerrain, groundBase,
    tiles, tileIds, elevations, radarColors, terrainObjects, structures, environmentProps, originalSize, localSize, origin, nameEn } = map;
  return copySaveData({ width, height, cells, spawns, id, name, theater, layout, resolvedTerrain, groundBase,
    tiles, tileIds, elevations, radarColors, terrainObjects, structures, environmentProps, originalSize, localSize, origin, nameEn });
}

export function createSaveGame(name: string, game: GameEngine, map: RenderMap, view?: SavedView): SaveGame {
  const result: SaveGame = { format: 'rustalarm-save', schemaVersion: 1, simulationVersion: 1,
    name: name.trim(), savedAt: new Date().toISOString(), map: captureMap(map), engine: game.captureSnapshot(),
    view: copySaveData(view ?? { camera: { x: 0, y: 0 }, zoom: 1, selection: [], groups: [], category: 'structure' }) };
  return validateSaveGame(result);
}

function assetId(value: unknown) { textValue(value, 100); requireSave(/^[a-z0-9_-]+$/i.test(value)); }
function validateRenderMap(map: SavedMap) {
  validateGameMap(map); const cells = map.width * map.height;
  for (const key of ['originalSize','localSize'] as const) if (map[key] !== undefined) {
    list(map[key], 4); requireSave(map[key]!.length === 4); for (const value of map[key]!) integer(value, 0, 512);
  }
  if (map.origin !== undefined) point(map.origin);
  if (map.nameEn !== undefined) textValue(map.nameEn);
  if (map.layout !== undefined) { requireSave(map.layout === 'rectangular'); requireSave(map.width <= 96 && map.height <= 96); }
  for (const [key, min, max, Type] of [
    ['tileIds', -2147483648, 2147483647, Int32Array], ['elevations', 0, 255, Uint8Array], ['radarColors', 0, 4294967295, Uint32Array],
  ] as const) {
    if (map[key] === undefined) continue;
    requireSave(Array.isArray(map[key]) || ArrayBuffer.isView(map[key]));
    const data = Array.from(map[key]!); requireSave(data.length === cells);
    for (const value of data) integer(value, min, max);
    Object.assign(map, { [key]: new Type(data) });
  }
  for (const key of ['terrainObjects', 'structures', 'environmentProps'] as const) {
    if (!map[key]) continue;
    list(map[key], cells * 4);
    for (const item of map[key]!) { point(item); assetId('id' in item ? item.id : item.type); }
  }
  if (map.tiles) {
    list(map.tiles, cells);
    for (const tile of map.tiles) {
      point(tile); integer(tile.tileId, -1, 65535); integer(tile.subTile, 0, 255);
      if (tile.theater !== undefined) requireSave(['temperate','snow','urban'].includes(tile.theater));
    }
  }
  if (map.groundBase) { record(map.groundBase); integer(map.groundBase.tileId, 0, 65535); integer(map.groundBase.subTile, 0, 255); requireSave(['temperate','snow','urban'].includes(map.groundBase.theater)); }
  if (map.resolvedTerrain) {
    list(map.resolvedTerrain, cells); requireSave(map.resolvedTerrain.length === cells);
    for (const cell of map.resolvedTerrain) {
      record(cell); textValue(cell.kind, 40); list(cell.layers, 16);
      if (cell.overlayKey !== undefined) { textValue(cell.overlayKey, 100); requireSave(/^[a-z0-9_:-]+$/i.test(cell.overlayKey)); }
      for (const layer of cell.layers) {
        record(layer); integer(layer.tileId, 0, 65535); integer(layer.subTile, 0, 255);
        requireSave(['temperate','snow','urban'].includes(layer.theater));
      }
    }
  }
}

export function validateSaveGame(value: unknown): SaveGame {
  checkSaveTree(value); record(value);
  requireSave(value.format === 'rustalarm-save');
  if (value.schemaVersion !== 1 || value.simulationVersion !== 1) throw new Error('存档版本不兼容。');
  textValue(value.name, 80); requireSave(value.name.trim().length > 0);
  textValue(value.savedAt, 40); requireSave(Number.isFinite(Date.parse(value.savedAt)));
  const save = copySaveData(value) as SaveGame;
  save.engine = validateEngineSnapshot(save.engine);
  requireSave(save.engine.status === 'playing');
  // The application controller currently assigns the human player ID zero.
  requireSave(save.engine.localPlayerId === 0 && save.engine.players.every((player, index) => player.id === index));
  validateRenderMap(save.map);
  requireSave(save.map.width === save.engine.map.width && save.map.height === save.engine.map.height
    && save.map.theater === save.engine.map.theater && save.map.cells.every((cell, index) => cell === save.engine.map.cells[index]));
  requireSave(stringifySaveData(save.map.spawns) === stringifySaveData(save.engine.map.spawns));
  record(save.view); record(save.view.camera);
  finite(save.view.camera.x, -100000, 100000); finite(save.view.camera.y, -100000, 100000); finite(save.view.zoom, .45, 1.7);
  requireSave(CATEGORIES.includes(save.view.category)); list(save.view.selection); list(save.view.groups, 9);
  const friendly = new Set(save.engine.entities.filter(e => e.owner === save.engine.localPlayerId && e.hp > 0).map(e => e.id));
  const filterIds = (ids: unknown) => { list(ids); for (const id of ids) integer(id, 1); return [...new Set(ids)].filter(id => friendly.has(id)); };
  save.view.selection = filterIds(save.view.selection);
  const groupNames = new Set<string>();
  for (const group of save.view.groups) {
    list(group, 2); requireSave(group.length === 2 && /^[1-9]$/.test(group[0]) && !groupNames.has(group[0]));
    groupNames.add(group[0]); group[1] = filterIds(group[1]);
  }
  return save;
}

export function encodeSaveGame(save: SaveGame): string {
  const json = stringifySaveData(validateSaveGame(save));
  if (new TextEncoder().encode(json).byteLength > MAX_SAVE_BYTES) throw new Error('存档文件超过 32 MB。');
  return json;
}

export function decodeSaveGame(json: string): SaveGame {
  if (json.length > MAX_SAVE_BYTES || new TextEncoder().encode(json).byteLength > MAX_SAVE_BYTES) throw new Error('存档文件超过 32 MB。');
  let value: unknown;
  try { value = JSON.parse(json); } catch { throw new Error('存档数据无效。'); }
  return validateSaveGame(value);
}
