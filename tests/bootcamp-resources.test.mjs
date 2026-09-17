/** 3D minerals must shrink with real quantities, vanish on depletion and never spill into adjacent cells. */
import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {ResourceScene} from '../src/bootcamp/resource-scene.js';
import {TerrainMaterials} from '../src/bootcamp/terrain-materials.js';

test('resource geometry and soil obey quantity, visibility and cell bounds without mutating the map',()=>{
  const map={width:3,height:1,cells:['ore','gem','land']};
  let visible=true;const ore=new Float32Array([5000,8000,0]);
  const view={map,localId:0,elevation:()=>0,game:{ore,time:0,visible:()=>visible}};
  const original=JSON.stringify(map),scene=new ResourceScene(view),surfaces=new TerrainMaterials(map);
  const count=()=>{let n=0;for(const {mesh} of scene.batches)for(let i=0;i<mesh.count;i++){const m=new T.Matrix4();mesh.getMatrixAt(i,m);if(m.determinant()>0)n++;}return n;};
  scene.update(view);surfaces.update(view);const full=count();assert.equal(full,96);
  for(const {mesh,samples} of scene.batches)for(let i=0;i<mesh.count;i++){
    const m=new T.Matrix4();mesh.getMatrixAt(i,m);const box=scene.geometry.clone();box.applyMatrix4(m);box.computeBoundingBox();
    const cell=samples[i].cell;assert.ok(box.boundingBox.min.x>=cell.x-.5&&box.boundingBox.max.x<=cell.x+.5);assert.ok(box.boundingBox.min.z>=-.5&&box.boundingBox.max.z<=.5);box.dispose();
  }
  ore[0]=1250;ore[1]=2000;scene.update(view);surfaces.update(view);assert.equal(count(),24);assert.equal(surfaces.mask.image.data[3],64);
  visible=false;scene.update(view);surfaces.update(view);assert.equal(count(),0);assert.equal(surfaces.mask.image.data[3],0);
  visible=true;scene.update(view);assert.equal(count(),24);
  ore.fill(0);scene.update(view);surfaces.update(view);assert.equal(count(),0);assert.equal(surfaces.mask.image.data[3],0);
  assert.equal(JSON.stringify(map),original);scene.dispose();surfaces.dispose();
});

// Review found empty coastline instances had no color buffer; skip the empty batch.
test('a land-only map has no coast batches and remains renderable',async()=>{
  const {EnvironmentScene}=await import('../src/bootcamp/environment-scene.js');
  const environment=new EnvironmentScene(),geometry=new T.PlaneGeometry(1,1),material=new T.MeshStandardMaterial();
  const scene=new T.Group();scene.add(new T.Mesh(geometry,material));environment.templates.set('grass',{scene});
  const view={map:{width:1,height:1,cells:['land']},elevation:()=>0,localId:0,game:{ore:new Float32Array(1),time:0,visible:()=>true,explored:()=>true}};
  environment.update(view);assert.equal(environment.groundMeshes.length,1);
  assert.equal(environment.batches.some(b=>b.mesh.userData.environment==='shore-bank'),false);environment.dispose();
});
