// Protect Bootcamp's shared-renderer contract: every actor has a real GLB, production stays
// terrain-valid and unrestricted by tech, opponents stay passive, and skirmish rules survive.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { actors, bootcampActors, bootcampTypes, BOOTCAMP_CREDITS } from '../bootcamp/catalog.js';
import { CATALOG, CATEGORIES, COUNTRIES } from './data';
import { GameEngine } from './engine';
import type { Entity, GameMap, GameOptions, Terrain } from './types';

const expectedSprites = {
  tanya: 'tany', apocalypse: 'mtnk', construction_yard: 'gacnst', nuclear_reactor: 'nanrct',
  soviet_refinery: 'narefn', war_miner: 'harv', rocketeer: 'rock', conscript: 'cons',
  rhino: 'htnk', destroyer: 'dest', barracks: 'gapile', giant_squid: 'sqd',
};

function battlefield(terrain: Terrain = 'land'): GameMap {
  const cells: Terrain[] = Array(48 * 48).fill(terrain);
  if (terrain === 'land') {
    for (let y = 0; y < 48; y++) for (let x = 37; x < 48; x++) cells[y * 48 + x] = 'water';
    cells[20 * 48 + 20] = 'cliff';
    cells[20 * 48 + 21] = 'void';
  }
  return { width: 48, height: 48, spawns: [{ x: 8, y: 8 }, { x: 30, y: 36 }], cells };
}
function training(options: Partial<GameOptions> = {}) {
  return new GameEngine({
    mode: 'bootcamp', map: battlefield(), startingCredits: 1, startingUnits: 0, fogOfWar: false,
    players: [
      { id: 0, name: 'Player', country: 'america', team: 0 },
      { id: 1, name: 'CPU', country: 'russia', team: 0, ai: true, difficulty: 'hard' },
    ], ...options,
  });
}
function advance(engine: GameEngine, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 5) engine.step(Math.min(5, seconds - elapsed));
}
function validPosition(engine: GameEngine, entity: Entity) {
  const def = CATALOG[entity.type], terrain = engine.terrainAt(entity.x, entity.y);
  assert.notEqual(terrain, 'void', `${entity.type} stays inside playable cells`);
  if (def.flying) return;
  assert.notEqual(terrain, 'cliff', `${entity.type} cannot spawn on a cliff`);
  assert.equal(terrain === 'water', !!def.naval, `${entity.type} uses its own land/sea domain`);
  if (entity.kind === 'building') {
    const bounds = engine.getPlacementBounds(entity.type, entity.x, entity.y);
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      assert.ok(!['water', 'cliff', 'void'].includes(engine.terrainAt(x, y)), `${entity.type} footprint is on valid land`);
    }
  }
}

test('verified Bootcamp catalog maps exactly twelve game types to original sprites and embedded GLBs', () => {
  assert.deepEqual([...bootcampTypes].sort(), Object.keys(expectedSprites).sort());
  assert.equal(bootcampActors.length, bootcampTypes.size, 'each game type has one model identity');
  for (const actor of bootcampActors) {
    assert.equal(actor.sprite, expectedSprites[actor.type as keyof typeof expectedSprites]);
    assert.equal(actor.sprite, CATALOG[actor.type].sprite);
    assert.ok((actor.height ?? actor.width ?? 0) > 0, `${actor.type} has a measured scale`);
    assert.equal(actor.forwardAxis.length, 3);
    assert.equal(Math.hypot(...actor.forwardAxis), 1, `${actor.type} has a unit forward axis`);
    const bytes = readFileSync(new URL(`../../assets/hd/models/${actor.file}`, import.meta.url));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${actor.type} is an actual GLB`);
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.ok(json.meshes.length && json.accessors.some((a: { count: number }) => a.count > 0));
    assert.ok(json.buffers.every((b: { uri?: string }) => !b.uri), 'model buffers are self-contained');
    assert.ok(json.images.every((image: { uri?: string; bufferView?: number }) => !image.uri && Number.isInteger(image.bufferView)), 'textures are embedded');
    if (actor.type === 'rhino') {
      assert.equal(actor.file, '../batch-two/htnk-v4-actions.glb', 'retain the approved Rhino revision');
      assert.equal(actor.teamColor, true);
      assert.ok(json.materials.some((m: { extras?: { ra2TeamColor?: { maskImage: number } } }) => Number.isInteger(m.extras?.ra2TeamColor?.maskImage)), 'approved geometry keeps its embedded team mask');
    }
    const axis = ['apocalypse', 'war_miner', 'rhino', 'destroyer'].includes(actor.type) ? [-1, 0, 0]
      : actor.type === 'giant_squid' ? [0, 0, -1] : [0, 0, 1];
    assert.deepEqual(actor.forwardAxis, axis, `${actor.type} preserves its verified travel direction`);
  }
  for (const environment of actors.filter(actor => actor.environment)) {
    assert.equal(environment.type, undefined, `${environment.id} remains scenery`);
    assert.equal(bootcampTypes.has(environment.id), false);
  }
});

test('every country sees the same twelve supported types without faction, technology or producer prerequisites', () => {
  for (const country of COUNTRIES) {
    const engine = training({ players: [{ id: 4, name: 'Player', country: country.id, team: 0 }], localPlayerId: 4 });
    for (const building of engine.entities.filter(e => e.kind === 'building')) assert.ok(engine.sell(building.id));
    engine.getPlayer()!.credits = 0;
    assert.deepEqual(engine.getAvailable(4).map(d => d.id).sort(), Object.keys(expectedSprites).sort(), country.id);
    for (const category of CATEGORIES) {
      assert.deepEqual(engine.getAvailable(4, category).map(d => d.id).sort(), Object.keys(expectedSprites).filter(id => CATALOG[id].category === category).sort());
    }
    for (const type of bootcampTypes) assert.equal(engine.canBuild(4, type), true, `${country.id} can build ${type} without a base`);
  }
});

for (const type of Object.keys(expectedSprites)) {
  test(`Bootcamp completes ${type} instantly and places a real, terrain-valid entity`, () => {
    const engine = training(), player = engine.getPlayer()!, def = CATALOG[type];
    for (const building of engine.entities.filter(e => e.owner === 0 && e.kind === 'building')) engine.sell(building.id);
    const before = new Set(engine.entities.map(e => e.id));
    player.credits = 0;
    engine.setDebugInstantProduction(false);
    assert.equal(engine.debugInstantProduction, true, 'training production cannot be accidentally disabled');
    assert.equal(engine.build(0, type), true, engine.lastMessage);
    if (def.kind === 'building') {
      assert.equal(player.queues[def.category][0]?.ready, true);
      assert.equal(engine.place(0, type, 26, 10), true, engine.lastMessage);
    }
    const produced = engine.entities.filter(e => !before.has(e.id) && e.type === type);
    assert.equal(produced.length, 1, 'one purchase yields one requested actor');
    assert.equal(produced[0].owner, 0);
    assert.equal(produced[0].hp, def.hp);
    assert.equal(player.queues[def.category].length, 0);
    assert.equal(engine.time, 0, 'instant completion requires no simulation tick');
    assert.equal(player.credits, BOOTCAMP_CREDITS);
    validPosition(engine, produced[0]);
    assert.ok(engine.entities.every(e => bootcampTypes.has(e.type)), 'gifts also stay inside the model whitelist');
  });
}

test('unsupported units, buildings and environment assets are rejected at UI-facing and engine entry points', () => {
  const engine = training(), player = engine.getPlayer()!;
  const unsupported = [...Object.keys(CATALOG).filter(type => !bootcampTypes.has(type)), ...actors.filter(actor => actor.environment).map(actor => actor.id), 'unknown_model'];
  const before = engine.entities.map(e => e.id);
  for (const type of unsupported) {
    assert.equal(engine.getAvailable(0).some(d => d.id === type), false, `${type} is hidden from production`);
    assert.equal(engine.canBuild(0, type), false);
    assert.equal(engine.build(0, type), false);
    assert.throws(() => engine.spawnEntity(type, 0, 20, 10), /Unsupported Bootcamp model/);
    assert.throws(() => engine.spawnEntity(type, 1, 20, 10), /Unsupported Bootcamp model/);
    if (CATALOG[type]?.kind === 'building') {
      const def = CATALOG[type];
      player.queues[def.category].push({ type, progress: 1, duration: 1, ready: true, paid: 0 });
      assert.equal(engine.canPlace(0, type, 26, 10), false);
      assert.equal(engine.place(0, type, 26, 10), false, 'a stale ready queue cannot bypass the whitelist');
      player.queues[def.category] = [];
    }
  }
  assert.deepEqual(engine.entities.map(e => e.id), before);
  for (const type of ['gi', 'grizzly', 'dreadnought']) {
    const category = CATALOG[type].category;
    player.queues[category].push({ type, progress: 0, duration: 1, ready: false, paid: 0 });
  }
  engine.step(.1);
  assert.ok(engine.entities.every(e => bootcampTypes.has(e.type)));
  assert.ok(CATEGORIES.every(category => player.queues[category].length === 0));
});

test('automatic starting actors and refinery gifts stay whitelisted for both factions and all players', () => {
  const engine = training({ startingUnits: 16, neutralStructures: [{ nativeType: 'caoild', x: 20, y: 30, health: 1, foundation: [2, 2] }] });
  for (const player of engine.players) {
    const own = engine.ownEntities(player.id);
    assert.equal(own.length, 17, 'a yard plus all sixteen configured starting units');
    assert.ok(own.every(e => bootcampTypes.has(e.type)));
    assert.ok(own.some(e => CATALOG[e.type].naval));
    assert.ok(own.some(e => CATALOG[e.type].flying));
    for (const entity of own) validPosition(engine, entity);
  }
  assert.ok(engine.entities.every(e => e.owner >= 0), 'unsupported original neutral structures are excluded');
  const miners = engine.entities.filter(e => e.type === 'war_miner' && e.owner === 0).length;
  assert.ok(engine.build(0, 'soviet_refinery'));
  assert.ok(engine.place(0, 'soviet_refinery', 26, 10));
  assert.equal(engine.entities.filter(e => e.type === 'war_miner' && e.owner === 0).length, miners + 1);
  assert.equal(engine.entities.some(e => e.type === 'chrono_miner'), false, 'an Allied player receives the supported War Miner');
  const yard = engine.ownEntities(0).find(e => e.type === 'construction_yard')!;
  assert.equal(engine.deploy([yard.id]), 0, 'packing cannot introduce an unsupported MCV');
  assert.equal(yard.type, 'construction_yard');
  engine.getPlayer()!.abilityCooldowns.paradrop = 0;
  assert.deepEqual(engine.getSupport(0), []);
  const before = engine.entities.length;
  assert.equal(engine.support(0, 'paradrop', 20, 12), false);
  assert.equal(engine.entities.length, before, 'support cannot introduce unsupported GIs');
});

test('placement keeps boundaries, terrain, occupancy and fog while waiving base adjacency', () => {
  const engine = training(), yard = engine.ownEntities(0).find(e => e.type === 'construction_yard')!;
  assert.equal(engine.canPlace(0, 'barracks', 26, 10), true, 'remote open land is allowed');
  for (const point of [{ x: -1, y: 12 }, { x: 48, y: 12 }, { x: 40, y: 12 }, { x: 20, y: 20 }, yard]) {
    assert.equal(engine.canPlace(0, 'barracks', point.x, point.y), false);
  }
  const unit = engine.spawnEntity('rhino', 0, 26, 10);
  assert.equal(engine.canPlace(0, 'barracks', unit.x, unit.y), false, 'ground units reserve their space');
  const fogged = training({ fogOfWar: true });
  assert.equal(fogged.canPlace(0, 'barracks', 26, 10), false);
  fogged.debugRevealMap = true;
  assert.equal(fogged.canPlace(0, 'barracks', 26, 10), true);
});

test('recruitment rejects impossible land or naval exits and permits aircraft over water', () => {
  const dry = training({ map: { ...battlefield(), cells: Array(48 * 48).fill('land') } });
  for (const type of ['destroyer', 'giant_squid']) {
    assert.equal(dry.canBuild(0, type), false);
    assert.equal(dry.build(0, type), false);
    assert.equal(dry.getPlayer()!.queues.naval.length, 0);
  }
  const wet = training({ map: battlefield('water') });
  assert.equal(wet.build(0, 'rhino'), false);
  for (const type of ['destroyer', 'giant_squid', 'rocketeer']) {
    assert.equal(wet.build(0, type), true);
    validPosition(wet, wet.entities.find(e => e.type === type && e.owner === 0)!);
  }
  const cramped = training({ map: { width: 1, height: 1, spawns: [{ x: .5, y: .5 }], cells: ['land'] }, players: [{ id: 0, name: 'Player', country: 'america', team: 0 }] });
  assert.equal(cramped.entities.length, 1);
  assert.equal(cramped.build(0, 'conscript'), false, 'occupied ground does not pile recruits onto one cell');
  assert.equal(cramped.build(0, 'rocketeer'), true, 'air and ground can share horizontal space');
  assert.equal(cramped.build(0, 'rocketeer'), false, 'occupied air cells are checked independently');
});

test('credits remain finite and replenished after sustained construction, repairs and an hour of training', () => {
  const engine = training({ localPlayerId: 1 }), player = engine.getPlayer()!;
  assert.equal(player.credits, BOOTCAMP_CREDITS);
  for (let i = 0; i < 250; i++) {
    player.credits = 0;
    assert.ok(engine.build(1, 'nuclear_reactor'));
    assert.equal(player.queues.structure[0].ready, true);
    assert.ok(engine.cancelBuild(1, 'structure'));
    assert.ok(Number.isSafeInteger(player.credits));
  }
  const yard = engine.ownEntities(1).find(e => e.type === 'construction_yard')!;
  yard.hp = 1;
  assert.ok(engine.repair(yard.id));
  advance(engine, 3600);
  assert.ok(engine.time > 3599);
  assert.equal(yard.hp, yard.maxHp);
  assert.ok(Number.isSafeInteger(player.credits));
  assert.ok(player.credits >= BOOTCAMP_CREDITS - 100, 'repair expenses cannot drain the replenishing funds');
  assert.equal(engine.status, 'playing');
});

test('Bootcamp opponents remain real, passive targets while friendly movement and combat still work', () => {
  const engine = training(), enemy = engine.spawnEntity('rhino', 1, 23.5, 18.5);
  const scout = engine.spawnEntity('rhino', 0, 19.5, 18.5);
  scout.holdFire = true;
  const before = { x: enemy.x, y: enemy.y, hp: scout.hp, count: engine.entities.length };
  advance(engine, 60);
  assert.equal(scout.hp, before.hp, 'nearby enemies do not automatically attack');
  assert.equal(engine.entities.length, before.count, 'enemy AI does not build an attacking army');
  engine.commandMove([scout.id], 12.5, 18.5);
  advance(engine, 5);
  assert.ok(scout.x < 15, 'friendly commands still move units');
  assert.deepEqual({ x: enemy.x, y: enemy.y }, { x: before.x, y: before.y }, 'enemy does not pursue');
  assert.equal(enemy.order.kind, 'idle');
  engine.commandAttack([scout.id], enemy.id);
  advance(engine, 4);
  assert.ok(enemy.hp < enemy.maxHp, 'explicit friendly attacks still damage the target');
  engine.commandStop([scout.id]);
  engine.commandMove([scout.id], 10.5, 18.5);
  advance(engine, 5);
  assert.deepEqual({ x: enemy.x, y: enemy.y }, { x: before.x, y: before.y }, 'being hit does not trigger pursuit');
  assert.ok(engine.ownEntities(1).length > 0);
});

test('training continues without either base or any surviving entities, but explicit surrender still exits', () => {
  for (const shortGame of [true, false]) {
    const engine = training({ shortGame });
    for (const e of [...engine.entities]) {
      if (e.kind === 'building') engine.sell(e.id);
      else e.hp = 0;
    }
    advance(engine, 90);
    assert.equal(engine.status, 'playing');
    assert.ok(engine.players.every(p => !p.defeated));
    assert.equal(engine.build(0, 'tanya'), true, 'a wiped-out trainee can recruit again');
    engine.surrender();
    assert.equal(engine.status, 'defeat');
  }
});

test('a normal skirmish still uses paid prerequisite production, autonomous AI attacks and elimination', () => {
  const engine = training({ mode: 'skirmish', startingCredits: 20000 });
  assert.equal(engine.bootcamp, false);
  assert.equal(engine.debugInstantProduction, false);
  assert.equal(engine.getPlayer()!.credits, 20000);
  assert.equal(engine.canBuild(0, 'tanya'), false);
  assert.equal(engine.canBuild(0, 'apocalypse'), false);
  const mcv = engine.ownEntities(0).find(e => e.type === 'allied_mcv')!;
  assert.equal(engine.deploy([mcv.id]), 1);
  assert.ok(engine.build(0, 'power_plant'), 'ordinary unsupported-in-Bootcamp buildings remain available');
  assert.equal(engine.getPlayer()!.credits, 20000 - CATALOG.power_plant.cost);
  assert.equal(engine.getPlayer()!.queues.structure[0].ready, false);
  const attackers = [0, 1, 2].map(i => engine.spawnEntity('rhino', 1, 28.5 + i * 2, 31.5));
  const enemy = engine.getPlayer(1)!;
  enemy.aiTimer = 0; enemy.aiAttackTimer = 0;
  engine.step(.1);
  assert.ok(engine.ownEntities(1).some(e => e.type === 'soviet_construction_yard'), 'AI deploys its base');
  assert.ok(attackers.every(e => e.order.kind === 'attackMove'), 'AI still organizes an assault');
  assert.ok(attackers.some(e => e.y < 31.5), 'assault units actually advance');
  assert.ok(enemy.queues.structure.length > 0, 'normal AI retains construction');
  for (const entity of [...engine.ownEntities(1)]) if (entity.kind === 'building') engine.sell(entity.id);
  advance(engine, 3);
  assert.equal(engine.status, 'victory', 'ordinary short-game elimination is unchanged');
});
