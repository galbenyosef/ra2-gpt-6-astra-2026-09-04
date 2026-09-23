import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameEngine } from '../src/game/engine';
import { availableTabs } from '../src/hud/availability';
import type { GameMap } from '../src/game/types';

test('the defense tab appears with superweapon support and closes when its building is sold', () => {
  const map: GameMap = { width: 32, height: 32, spawns: [{ x: 8, y: 8 }], cells: Array(32 * 32).fill('land') };
  const game = new GameEngine({ map, players: [{ id: 0, name: 'Player', country: 'america', team: 0 }], startingUnits: 0, fogOfWar: false });
  assert.equal(availableTabs(game).includes('defense'), false);
  const weather = game.spawnEntity('weather_control', 0, 15, 15);
  assert.deepEqual(game.getSupport(0).map(ability => ability.id), ['lightning']);
  assert.equal(availableTabs(game).includes('defense'), true);
  assert.ok(game.sell(weather.id));
  assert.equal(availableTabs(game).includes('defense'), false);
});
