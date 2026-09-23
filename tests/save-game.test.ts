import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameEngine } from '../src/game/engine';
import { createSaveGame, encodeSaveGame, decodeSaveGame, validateSaveGame, MAX_SAVE_BYTES } from '../src/save-game';
import { savedLobbyMap } from '../src/save-map';

function fixture() {
  const map = { id: 'imported-test', name: 'Imported map', theater: 'temperate', width: 24, height: 24,
    cells: Array(576).fill('land'), spawns: [{ x: 6, y: 6 }, { x: 18, y: 18 }],
    tileIds: new Int32Array(576), elevations: new Uint8Array(576), radarColors: new Uint32Array(576),
    terrainObjects: [{ x: 12, y: 12, type: 'tree01' }], layout: 'rectangular' as const,
    environmentProps: [{ id: 'road-straight', x: 10, y: 10, rotation: .5 }] };
  const game = new GameEngine({ map, seed: 10, startingUnits: 1,
    players: [{ id: 0, name: 'Player', country: 'america', team: 1 }, { id: 1, name: 'CPU', country: 'russia', team: 2 }] });
  game.step(.17);
  return { game, map };
}

test('portable JSON restores typed arrays and self-contained imported map data', () => {
  const { game, map } = fixture();
  const save = createSaveGame('Before attack', game, map, { camera: { x: 120, y: 90 }, zoom: 1.3,
    selection: [game.entities[0].id], groups: [['1', [game.entities[0].id]]], category: 'vehicle' });
  const decoded = decodeSaveGame(encodeSaveGame(save));
  assert.deepEqual(decoded, save);
  assert.deepEqual(GameEngine.fromSnapshot(decoded.engine).captureSnapshot(), game.captureSnapshot());
  assert.equal(decoded.map.terrainObjects?.[0].type, 'tree01');
  assert.ok(decoded.map.tileIds instanceof Int32Array);
  assert.ok(decoded.engine.ore instanceof Float32Array);
});

test('saves keep the game version, six-character commit and map overview across export', () => {
  const { game, map } = fixture();
  const save = createSaveGame('Recognizable save', game, map);
  assert.match(save.gameVersion!, /^\d+\.\d+\.\d+/);
  save.commitHash = 'a1b2c3';
  const decoded = decodeSaveGame(encodeSaveGame(save));
  assert.equal(decoded.gameVersion, save.gameVersion);
  assert.equal(decoded.commitHash, 'a1b2c3');
  assert.equal(decoded.overview.pixels.length, decoded.overview.width * decoded.overview.height);
  assert.ok(new Set(decoded.overview.pixels).size > 1);
  assert.deepEqual(decoded.overview, save.overview);
  for (const change of [
    (s: any) => { s.commitHash = 'abcdef0'; },
    (s: any) => { s.commitHash = '<html>'; },
    (s: any) => { s.gameVersion = ''; },
    (s: any) => { s.overview.pixels.pop(); },
    (s: any) => { s.overview.pixels[0] = 0x1000000; },
    (s: any) => { s.overview.width = 10000; },
  ]) {
    const invalid = structuredClone(save); change(invalid);
    assert.throws(() => validateSaveGame(invalid));
  }
});

test('legacy saves get a map overview without inventing their original game version', () => {
  const { game, map } = fixture();
  const legacy = JSON.parse(encodeSaveGame(createSaveGame('Old save', game, map)));
  delete legacy.gameVersion; delete legacy.commitHash; delete legacy.overview;
  const restored = decodeSaveGame(JSON.stringify(legacy));
  assert.equal(restored.gameVersion, null);
  assert.equal(restored.commitHash, null);
  assert.ok(new Set(restored.overview.pixels).size > 1);
  assert.deepEqual(GameEngine.fromSnapshot(restored.engine).captureSnapshot(), game.captureSnapshot());
});

test('portable save rejects unsupported versions, malformed arrays and invalid references', () => {
  const { game, map } = fixture();
  const save = createSaveGame('Test', game, map);
  for (const change of [
    (s: any) => { s.schemaVersion = 99; },
    (s: any) => { s.simulationVersion = 99; },
    (s: any) => { s.engine.ore = [1]; },
    (s: any) => { s.engine.entities[1].id = s.engine.entities[0].id; },
    (s: any) => { s.engine.entities[0].transportedBy = 99999; },
    (s: any) => { s.engine.entities[0].order = { kind: 'attack', targetId: s.engine.nextId + 1 }; },
    (s: any) => { s.engine.localPlayerId = 1; },
    (s: any) => { s.map.width = 25; },
    (s: any) => { s.map.terrainObjects[0].type = '<script>'; },
    (s: any) => { s.view.camera.x = Infinity; },
  ]) {
    const invalid = structuredClone(save); change(invalid);
    assert.throws(() => validateSaveGame(invalid));
  }
  assert.throws(() => decodeSaveGame('{"format":'));
  assert.throws(() => decodeSaveGame(' '.repeat(MAX_SAVE_BYTES + 1)));
  assert.throws(() => decodeSaveGame('{"__proto__":{"polluted":true}}'));
  assert.equal(({} as any).polluted, undefined);
});

test('exported saves continue identically after both games receive the same commands', () => {
  const { game, map } = fixture();
  const restored = GameEngine.fromSnapshot(decodeSaveGame(encodeSaveGame(createSaveGame('Test', game, map))).engine);
  for (const g of [game, restored]) g.commandMove(g.entities.filter(e => e.owner === 0 && e.kind === 'unit').map(e => e.id), 12, 12);
  for (let i = 0; i < 100; i++) { game.step(.06); restored.step(.06); }
  assert.deepEqual(restored.captureSnapshot(), game.captureSnapshot());
});

test('native map geometry survives loading and returning to the lobby', () => {
  const { game, map } = fixture();
  const native = { ...map, layout: undefined, originalSize: [0, 0, 12, 18], localSize: [1, 2, 10, 14], origin: { x: 4, y: 7 } };
  const save = decodeSaveGame(encodeSaveGame(createSaveGame('Native map', game, native)));
  const lobby = savedLobbyMap(save);
  assert.equal(lobby.layout, undefined);
  assert.deepEqual(lobby.originalSize, native.originalSize);
  assert.deepEqual(lobby.localSize, native.localSize);
  assert.deepEqual(lobby.origin, native.origin);
});
