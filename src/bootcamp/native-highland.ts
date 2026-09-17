/** Flat training-field tops and exposed side faces; simulation heights stay untouched. */
import type { Assets } from '../assets';
import type { RenderMap } from '../renderer';
import type { ResolvedTerrainCell } from '../custom-terrain';
import { projectTile, type TerrainPainter } from '../terrain-painter';
import { TRAINING_MAP_ID } from './training-map';

/** NW, NE, SE, SW corners in cell space. Ramps rise toward +y, like the authored GLB. */
export function highlandCorners(map: RenderMap, x: number, y: number): number[] {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return [0, 0, 0, 0];
  const height = map.elevations?.[y * map.width + x] ?? 0;
  const ramp = map.environmentProps?.some(p => p.id === 'ramp' && p.x === x && p.y === y);
  return ramp ? [height, height, height + 1, height + 1] : [height, height, height, height];
}

/** Only the authored exhibit opts in; ordinary editor cliffs and native TMP maps keep their artwork. */
export function drawTrainingHighland(ctx: CanvasRenderingContext2D, map: RenderMap,
  cell: ResolvedTerrainCell | undefined, painter: TerrainPainter, assets: Assets, x: number, y: number): boolean {
  if (map.id !== TRAINING_MAP_ID || cell?.kind !== 'cliff' || cell.layers.length < 2) return false;
  const heights = highlandCorners(map, x, y), center = projectTile(x, y);
  const corners = [{x: 0, y: -15}, {x: 30, y: 0}, {x: 0, y: 15}, {x: -30, y: 0}];
  const rock = cell.layers[1], sprite = assets.terrain[`${rock.theater}:${rock.tileId}:${rock.subTile}`];
  const image = sprite && assets.images.get(sprite.src);
  const top = cell.layers[0], topSprite = assets.terrain[`${top.theater}:${top.tileId}:${top.subTile}`];
  if (!image || !topSprite || !assets.images.has(topSprite.src)) return false;
  ctx.save();
  ctx.translate(center.x, center.y);
  // Camera-facing +x and +y boundaries only. Equal-height neighbors have no internal wall.
  const east = highlandCorners(map, x + 1, y), south = highlandCorners(map, x, y + 1);
  for (const [a, b, lowA, lowB] of [[1, 2, east[0], east[3]], [2, 3, south[1], south[0]]]) {
    const dropA = Math.max(0, heights[a] - lowA) * 15, dropB = Math.max(0, heights[b] - lowB) * 15;
    const depth = Math.max(dropA, dropB);
    if (!depth) continue;
    const start = {x: corners[a].x, y: corners[a].y - heights[a] * 15};
    const end = {x: corners[b].x, y: corners[b].y - heights[b] * 15};
    ctx.save();
    ctx.beginPath();ctx.moveTo(start.x, start.y);ctx.lineTo(end.x, end.y);
    ctx.lineTo(end.x, end.y + dropB);ctx.lineTo(start.x, start.y + dropA);ctx.closePath();ctx.clip();
    // Sample the opaque middle of the original cliff face, not its tall silhouette or transparent border.
    ctx.transform(end.x - start.x, end.y - start.y, 0, depth, start.x, start.y);
    ctx.drawImage(image, sprite.x + sprite.width * .65, sprite.y + sprite.height * .4,
      sprite.width * .25, sprite.height * .25, 0, 0, 1, 1);
    ctx.restore();
  }
  // An affine projection keeps the grass continuous over both horizontal tops and the one-level ramp.
  const rise = heights[3] - heights[0];
  ctx.transform(1, rise / 4, 0, 1 - rise / 2, 0, -(heights[0] + rise / 2) * 15);
  // TMP diamonds have transparent boundary pixels; a grass-colored bed seals the slope joins.
  ctx.beginPath();ctx.moveTo(0, -15);ctx.lineTo(30, 0);ctx.lineTo(0, 15);ctx.lineTo(-30, 0);ctx.closePath();
  ctx.fillStyle = '#a2a850';ctx.fill();
  painter.drawNativeTile(ctx, top, top.theater, 0, 0);
  ctx.restore();
  return true;
}
