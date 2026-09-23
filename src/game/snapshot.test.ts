import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameEngine } from './engine';
import { CATALOG } from './data';
import { stringifySaveData } from './snapshot';
import type { GameMap } from './types';

function battle(mode: 'skirmish' | 'bootcamp' = 'skirmish') {
  const map: GameMap = { id: 'saved-map', name: 'Saved map', width: 40, height: 40,
    cells: Array(1600).fill('land'), spawns: [{ x: 8, y: 8 }, { x: 31, y: 31 }] };
  (map.cells as string[])[410] = 'ore';
  return new GameEngine({ mode, map, seed: 12345, startingUnits: 3, startingCredits: 30000,
    players: [{ id: 0, name: 'Player', country: 'america', team: 1 },
      { id: 1, name: 'CPU', country: 'russia', team: 2, ai: true, difficulty: 'hard' }],
    neutralStructures: [{ nativeType: 'caoild', x: 20, y: 20, health: 256, foundation: [2, 2] }] });
}

test('JSON restoration preserves unused and independent attack warning cooldowns', () => {
  class WarningEngine extends GameEngine {
    hit(id: number) { this.damage(this.getEntity(id)!, 1, 1); }
  }
  const original = battle();
  const base = original.spawnEntity('power_plant', 0, 12, 12);
  const miner = original.spawnEntity('chrono_miner', 0, 15, 12);
  const restore = (engine: GameEngine) => GameEngine.fromSnapshot(JSON.parse(stringifySaveData(engine.captureSnapshot())));
  assert.deepEqual(original.captureSnapshot().alarmAt, { base: null, miner: null });
  const fresh = restore(original);
  for (const engine of [original, fresh]) {
    engine.time = 5; WarningEngine.prototype.hit.call(engine, base.id);
    engine.time = 35; WarningEngine.prototype.hit.call(engine, miner.id);
  }
  assert.deepEqual(fresh.captureSnapshot(), original.captureSnapshot());
  const restored = restore(original);
  for (const engine of [original, restored]) {
    const count = () => engine.events.filter(event => event.kind === 'warning').length;
    assert.equal(count(), 2);
    engine.time = 64.9; WarningEngine.prototype.hit.call(engine, base.id); assert.equal(count(), 2);
    engine.time = 65; WarningEngine.prototype.hit.call(engine, base.id); assert.equal(count(), 3);
    engine.time = 94.9; WarningEngine.prototype.hit.call(engine, miner.id); assert.equal(count(), 3);
    engine.time = 95; WarningEngine.prototype.hit.call(engine, miner.id); assert.equal(count(), 4);
  }
  assert.deepEqual(restored.captureSnapshot(), original.captureSnapshot());
  const malformed = JSON.parse(stringifySaveData(original.captureSnapshot()));
  delete malformed.alarmAt.miner;
  assert.throws(() => GameEngine.fromSnapshot(malformed));
});

test('snapshot restores typed arrays, orders, production and independent mutable state', () => {
  const original = battle();
  original.deploy(original.entities.filter(e => e.type.includes('mcv')).map(e => e.id));
  original.build(0, 'power_plant');
  const unit = original.entities.find(e => e.owner === 0 && e.kind === 'unit')!;
  original.commandMove([unit.id], 15, 15);
  original.commandMove([unit.id], 22, 15, false, true);
  original.step(.13);
  original.ore[410] = 123.25;
  const snapshot = original.captureSnapshot();
  const restored = GameEngine.fromSnapshot(snapshot);
  assert.deepEqual(restored.captureSnapshot(), snapshot);
  assert.ok(restored.ore instanceof Float32Array);
  assert.ok(restored.players[0].explored instanceof Uint8Array);
  restored.entities[0].hp -= 10;
  restored.players[0].queues.structure[0].progress = 99;
  restored.ore[410] = 0;
  assert.deepEqual(original.captureSnapshot(), snapshot);
});

for (const mode of ['skirmish', 'bootcamp'] as const) {
  test(`${mode} continues identically after restoring timers, randomness and spatial buckets`, () => {
    const original = battle(mode);
    original.setDebugMapReveal(true, 1);
    original.adjustDebugCredits(-123, 0);
    if (mode === 'skirmish') original.deploy(original.entities.filter(e => e.type.includes('mcv')).map(e => e.id));
    original.spawnEntity('rhino', 0, 18, 18);
    original.spawnEntity('rhino', 1, 21, 18);
    for (let i = 0; i < 87; i++) original.step(.07);
    const restored = GameEngine.fromSnapshot(original.captureSnapshot());
    for (let i = 0; i < 450; i++) {
      if (i === 25) for (const engine of [original, restored]) engine.commandMove(
        engine.entities.filter(e => e.owner === 0 && e.kind === 'unit').map(e => e.id), 22, 22, true);
      original.step(.07); restored.step(.07);
      assert.deepEqual(restored.captureSnapshot(), original.captureSnapshot(), `step ${i}`);
    }
  });
}

test('neutral definitions survive a fresh engine and restore without starting armies', () => {
  const original = battle();
  const snapshot = original.captureSnapshot();
  const definition = CATALOG.neutral_caoild;
  delete CATALOG.neutral_caoild;
  try {
    const restored = GameEngine.fromSnapshot(snapshot);
    assert.equal(restored.entities.length, original.entities.length);
    assert.equal(CATALOG.neutral_caoild.income, definition.income);
    assert.deepEqual(restored.captureSnapshot(), snapshot);
  } finally { CATALOG.neutral_caoild = definition; }
});

test('invalid snapshots fail before modifying global definitions or a running match', () => {
  const original = battle(), snapshot = original.captureSnapshot();
  const invalid = structuredClone(snapshot);
  invalid.entities[0].type = 'unknown-unit';
  assert.throws(() => GameEngine.fromSnapshot(invalid));
  assert.deepEqual(original.captureSnapshot(), snapshot);
  const truncated = structuredClone(snapshot);
  truncated.players[0].explored = new Uint8Array(1);
  assert.throws(() => GameEngine.fromSnapshot(truncated));
});

test('transport passengers, delayed bombs, ready buildings and spent ore survive JSON restoration', () => {
  const original = battle();
  original.deploy(original.entities.filter(e => e.type.includes('mcv')).map(e => e.id));
  original.setDebugInstantProduction(true);
  assert.ok(original.build(0, 'power_plant'));
  const transport = original.spawnEntity('allied_transport', 0, 15.5, 15.5);
  const passenger = original.spawnEntity('gi', 0, 15.5, 16);
  assert.equal(original.load([passenger.id], transport.id), 1);
  const target = original.spawnEntity('rhino', 1, 25, 15);
  target.bomb = { detonatesAt: original.time + 2, owner: 0, damage: 100, sourceId: passenger.id };
  original.ore[410] = 0;
  original.players[0].abilityCooldowns.paradrop = 35.25;
  const restored = GameEngine.fromSnapshot(JSON.parse(stringifySaveData(original.captureSnapshot())));
  assert.deepEqual(restored.captureSnapshot(), original.captureSnapshot());
  for (const engine of [original, restored]) {
    engine.commandMove([transport.id], 19, 16);
    for (let i = 0; i < 60; i++) engine.step(.1);
    assert.equal(engine.unload([transport.id]), 1);
    assert.ok(engine.players[0].queues.structure[0].ready);
    assert.equal(engine.ore[410], 0);
  }
  assert.deepEqual(restored.captureSnapshot(), original.captureSnapshot());
});

test('removed entities in an unrefreshed spatial bucket do not change continuation', () => {
  const original = battle();
  const infantry = original.spawnEntity('terrorist', 0, 15, 15);
  original.spawnEntity('rhino', 1, 15.5, 15);
  original.step(.05);
  assert.equal(original.getEntity(infantry.id), undefined);
  const snapshot = original.captureSnapshot();
  assert.ok(snapshot.spatialRetired.some(entity => entity.id === infantry.id));
  const restored = GameEngine.fromSnapshot(JSON.parse(stringifySaveData(snapshot)));
  for (let i = 0; i < 20; i++) { original.step(.03); restored.step(.03); }
  assert.deepEqual(restored.captureSnapshot(), original.captureSnapshot());
});
