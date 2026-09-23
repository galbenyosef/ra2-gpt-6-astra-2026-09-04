import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameEngine } from '../src/game/engine';
import { createSaveOverview } from '../src/save-overview';

function fixture(fogOfWar = true) {
  const map = { width: 24, height: 32, cells: Array(24 * 32).fill('land'), spawns: [{ x: 6, y: 6 }, { x: 18, y: 25 }] };
  const engine = new GameEngine({ map, fogOfWar, startingUnits: 0, seed: 1, players: [
    { id: 0, name: 'Player', country: 'america', team: 1, color: '#ff0000' },
    { id: 1, name: 'Enemy', country: 'russia', team: 2, color: '#0000ff' },
  ] });
  engine.entities = [];
  engine.players[0].explored.fill(0); engine.players[0].fog.fill(0);
  return { map, engine };
}

test('save overview hides unexplored terrain and unseen enemies', () => {
  const { map, engine } = fixture();
  const hidden = createSaveOverview(map, engine.captureSnapshot());
  engine.spawnEntity('rhino', 1, 16, 22);
  assert.deepEqual(createSaveOverview(map, engine.captureSnapshot()), hidden);
  engine.players[0].explored.fill(1);
  const explored = createSaveOverview(map, engine.captureSnapshot());
  assert.notDeepEqual(explored, hidden);
  assert.ok(!explored.pixels.includes(0x0000ff));
  engine.players[0].fog.fill(1);
  assert.ok(createSaveOverview(map, engine.captureSnapshot()).pixels.includes(0x0000ff));
  engine.players[0].fog.fill(0); engine.players[0].explored.fill(0);
  engine.setDebugMapReveal(true, 0);
  assert.ok(createSaveOverview(map, engine.captureSnapshot()).pixels.includes(0x0000ff));
});

test('save overview fits native void boundaries and excludes dead or transported entities', () => {
  const { map, engine } = fixture(false);
  map.cells.fill('void');
  for (let y = 8; y < 24; y++) for (let x = 4; x < 20; x++) map.cells[y * map.width + x] = 'water';
  const baseline = createSaveOverview(map, engine.captureSnapshot());
  const dead = engine.spawnEntity('rhino', 0, 8, 16); dead.hp = 0;
  const passenger = engine.spawnEntity('gi', 0, 12, 16); passenger.transportedBy = 1000;
  assert.deepEqual(createSaveOverview(map, engine.captureSnapshot()), baseline);
  assert.ok(baseline.pixels.includes(0x153f57));
  assert.equal(baseline.pixels.length, baseline.width * baseline.height);
  assert.ok(baseline.pixels.slice(0, baseline.width).every(color => color === baseline.pixels[0]));
  const building = engine.spawnEntity('power_plant', 0, 10, 16);
  assert.ok(createSaveOverview(map, engine.captureSnapshot()).pixels.includes(0xff0000));
  assert.equal(building.hp > 0, true);
});
