/** Repeated cliff sprites hid the plateau; continuous corner heights must join its top and ramp.
 * The presentation must never change blocked cells or the engine's integer elevations.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {createTrainingMap} from '../src/bootcamp/training-map';
import {highlandCorners} from '../src/bootcamp/native-highland';

test('the raised top is flat and joins every ramp without internal height steps',()=>{
 const map=createTrainingMap(),before=structuredClone(map);
 for(let y=5;y<=9;y++)for(let x=3;x<=6;x++)assert.deepEqual(highlandCorners(map,x,y),[1,1,1,1]);
 for(let x=3;x<=6;x++){
  const ramp=highlandCorners(map,x,4),top=highlandCorners(map,x,5);
  assert.deepEqual(ramp,[0,0,1,1]);assert.equal(ramp[2],top[1]);assert.equal(ramp[3],top[0]);
  assert.equal(map.cells[4*map.width+x],'cliff');assert.equal(map.elevations[4*map.width+x],0);
 }
 assert.deepEqual(highlandCorners(map,7,7),[0,0,0,0]);
 assert.deepEqual(highlandCorners(map,4,10),[0,0,0,0]);
 assert.deepEqual(map,before);
});
