import type { MapData, MapTile, Terrain } from './maps';
import type { SaveGame } from './save-game';

/** Rebuild lobby metadata from the saved map without fetching an imported map again. */
export function savedLobbyMap(save: SaveGame): MapData {
  const map = save.map, count = map.width * map.height, cells = map.cells.map(cell => cell === 'void' || cell === 'bridge' ? 'cliff' : cell) as Terrain[];
  const tileIds = map.tileIds ? new Int32Array(map.tileIds) : new Int32Array(count);
  const elevations = map.elevations ? new Uint8Array(map.elevations) : new Uint8Array(count);
  const subTiles = new Uint8Array(count), overlays = new Uint8Array(count).fill(255), overlayFrames = new Uint8Array(count);
  const tiles: MapTile[] = [];
  for (const tile of map.tiles ?? []) {
    const index = tile.y * map.width + tile.x;
    tileIds[index] = tile.tileId; subTiles[index] = tile.subTile; elevations[index] = tile.elevation ?? tile.z ?? elevations[index];
    overlays[index] = tile.overlay ?? 255; overlayFrames[index] = tile.overlayFrame ?? 0;
    tiles.push({ ...tile, originalX: tile.x, originalY: tile.y, elevation: elevations[index], terrain: cells[index],
      overlay: overlays[index], overlayFrame: overlayFrames[index], slope: 0 });
  }
  const definitions = new Map(save.engine.neutralDefinitions.map(definition => [definition.id, definition]));
  return {
    id: map.id ?? 'saved-map', name: map.name ?? save.name, nameEn: map.nameEn ?? map.name ?? save.name,
    width: map.width, height: map.height, players: map.spawns.length, theater: map.theater ?? 'temperate',
    cells, tiles, spawns: map.spawns.map(point => ({ ...point })), tileIds, subTiles, elevations, overlays, overlayFrames,
    valid: new Uint8Array(map.cells.map(cell => cell === 'void' ? 0 : 1)), radarColors: map.radarColors ? new Uint32Array(map.radarColors) : new Uint32Array(count),
    origin: map.origin ? { ...map.origin } : { x: 0, y: 0 },
    originalSize: [...map.originalSize ?? [0, 0, map.width, map.height]], localSize: [...map.localSize ?? [0, 0, map.width, map.height]],
    scenery: map.terrainObjects?.map(item => ({ ...item })) ?? [],
    structures: save.engine.entities.filter(entity => definitions.has(entity.type)).map(entity => {
      const definition = definitions.get(entity.type)!;
      return { type: entity.type.slice('neutral_'.length), x: entity.x - definition.size![0] / 2,
        y: entity.y - definition.size![1] / 2, health: entity.hp / entity.maxHp * 256, owner: 'Neutral', facing: 0 };
    }),
    environmentProps: map.environmentProps?.map(item => ({ ...item })),
    ini: {}, official: false, source: '存档', warnings: [],
    layout: map.layout,
  };
}
