/** The authored field must remain playable with identical terrain and supported game actors. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createTrainingMap,TRAINING_MAP_ID} from '../src/bootcamp/training-map';
import {environmentAssets} from '../src/bootcamp/environment-catalog.js';
import {bootcampTypes} from '../src/bootcamp/catalog.js';
import {GameEngine} from '../src/game';

test('the default Bootcamp field has land, water, connected road bends and existing environment identities',()=>{
  const map=createTrainingMap();assert.equal(map.id,TRAINING_MAP_ID);
  assert.deepEqual(createTrainingMap(),map,'layout is deterministic');
  assert.ok(map.cells.includes('water'));assert.ok(map.cells.includes('ore'));
  const available=new Set(environmentAssets.map(asset=>asset.id));
  assert.ok(map.environmentProps!.every(p=>available.has(p.id)));
  for(const [x,y] of [[22,18],[22,19],[23,20],[24,20]])assert.equal(map.cells[y*map.width+x],'road','bend connects north and east straights');
  for(const p of map.environmentProps!.filter(p=>p.id==='ramp'))assert.equal(map.cells[p.y*map.width+p.x],'cliff','decorative ramp stays blocked until height pathfinding exists');
  const engine=new GameEngine({mode:'bootcamp',map,players:[{id:0,name:'Player',country:'america',team:1},{id:1,name:'Target',country:'russia',team:2,ai:true}],startingUnits:8,fogOfWar:false});
  for(const player of engine.players){
    assert.equal(engine.ownEntities(player.id).length,9,'each side has a yard and eight playable types');
    for(const e of engine.ownEntities(player.id))assert.ok(bootcampTypes.has(e.type));
    for(const e of engine.ownEntities(player.id).filter(e=>['giant_squid','destroyer'].includes(e.type)))assert.equal(engine.terrainAt(e.x,e.y),'water');
  }
});

test('all nine environment assets are existing embedded GLBs and never recruitable types',()=>{
  assert.equal(environmentAssets.length,9);
  for(const asset of environmentAssets){
    assert.equal(bootcampTypes.has(asset.id),false);
    const bytes=readFileSync(new URL('../assets/hd/models/'+asset.file,import.meta.url));
    assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
    const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    assert.ok(json.meshes.length);assert.ok(json.buffers.every((b:{uri?:string})=>!b.uri));
  }
});
