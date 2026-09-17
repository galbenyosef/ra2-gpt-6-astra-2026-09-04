// Instanced authored terrain, roads and trees on the simulation's actual map cells.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {environmentAssets} from './environment-catalog.js';
import {appUrl} from '../urls';
import {heightStep} from './camera.js';
import {TerrainMaterials} from './terrain-materials.js';
import {ResourceScene} from './resource-scene.js';
export class EnvironmentScene {
  root=new T.Group();templates=new Map();batches=[];groundMeshes=[];disposed=false;
  static async load(signal){
    const world=new EnvironmentScene(),loader=new GLTFLoader();
    try{
      for(const config of environmentAssets){
        const response=await fetch(appUrl(__BOOTCAMP_MODEL_URLS__[config.id]),{signal});if(!response.ok)throw Error('Missing environment '+config.id);
        const gltf=await loader.parseAsync(await response.arrayBuffer(),'');world.templates.set(config.id,gltf);
        if(signal.aborted)throw new DOMException('Aborted','AbortError');
      }
      return world;
    }catch(error){world.dispose();throw error;}
  }
  bind(view){
    if(this.map===view.map)return;this.map=view.map;
    this.surfaces=new TerrainMaterials(view.map);this.resources=new ResourceScene(view);this.root.add(this.resources.root);
    this.addShoreBanks(view);
    const groups=new Map(),add=(id,x,y,height=0,rotation=0,ground=false)=>{
      const key=id+':'+ground;if(!groups.has(key))groups.set(key,{id,ground,positions:[]});
      groups.get(key).positions.push({x,y,height,rotation});
    };
    const props=view.map.environmentProps||[],ramps=new Set(props.filter(p=>p.id==='ramp').map(p=>p.x+':'+p.y));
    for(let y=0;y<view.map.height;y++)for(let x=0;x<view.map.width;x++){
      const terrain=view.map.cells[y*view.map.width+x];if(terrain==='void')continue;
      const elevation=view.elevation(x,y)*heightStep;
      const id=ramps.has(x+':'+y)?'ramp':terrain==='water'?'ocean':terrain==='cliff'?'plateau':'grass';
      add(id,x,y,id==='plateau'?elevation-heightStep:id==='ocean'?elevation-.035:elevation,0,true);
      if(terrain==='road'){
        // A placed bend owns its four cells; straights join the existing road network.
        if(props.some(p=>p.id==='curved-road'&&Math.abs(x-p.x)<=.5&&Math.abs(y-p.y)<=.5))continue;
        const horizontal=view.map.cells[y*view.map.width+x-1]==='road'||view.map.cells[y*view.map.width+x+1]==='road';
        add('dirt-road',x,y,elevation+.004,horizontal?Math.PI/2:0);
      }
    }
    const scenery=props.length?props:(view.map.terrainObjects||[]).filter(p=>this.templates.has(p.type.toLowerCase())).map(p=>({id:p.type.toLowerCase(),x:p.x,y:p.y}));
    for(const p of scenery)if(p.id!=='ramp')add(p.id,p.x,p.y,view.elevation(p.x,p.y)*heightStep+(p.id.includes('road')?.004:0),p.rotation||0);
    for(const {id,positions,ground} of groups.values()){
      const template=this.templates.get(id)?.scene;if(!template)continue;template.updateMatrixWorld(true);
      const normalize=new T.Matrix4();
      if(['tree26','dirt-road','curved-road'].includes(id)){
        const box=new T.Box3().setFromObject(template),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
        const scale=id==='tree26'?2.1/size.y:(id==='curved-road'?2:1)/Math.max(size.x,size.z);
        normalize.makeScale(scale,scale,scale);normalize.setPosition(-center.x*scale,-box.min.y*scale,-center.z*scale);
      }
      template.traverse(source=>{
        if(!source.isMesh)return;
        const mesh=new T.InstancedMesh(source.geometry,Array.isArray(source.material)?source.material.map(m=>this.surfaces.prepare(m,id)):this.surfaces.prepare(source.material,id),positions.length),matrices=[];
        mesh.userData.environment=id;mesh.frustumCulled=false;
        for(const [i,p] of positions.entries()){
          const matrix=new T.Matrix4().makeRotationY(p.rotation);matrix.setPosition(p.x,p.height,p.y);matrix.multiply(normalize).multiply(source.matrixWorld);
          matrices.push(matrix);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new T.Color(1,1,1));
        }
        mesh.computeBoundingSphere();this.root.add(mesh);if(ground)this.groundMeshes.push(mesh);
        this.batches.push({mesh,positions,matrices,ground});
      });
    }
  }
  addShoreBanks(view){
    const positions=[],matrices=[];
    for(let y=0;y<view.map.height;y++)for(let x=0;x<view.map.width;x++){
      const cell=view.map.cells[y*view.map.width+x];if(cell==='water'||cell==='void')continue;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy;
        if(nx<0||ny<0||nx>=view.map.width||ny>=view.map.height||view.map.cells[ny*view.map.width+nx]!=='water')continue;
        // Close only the existing 0.035-cell gap; no beach geometry extends into navigable water.
        const top=view.elevation(x,y)*heightStep,bottom=view.elevation(nx,ny)*heightStep-.035;
        const matrix=new T.Matrix4().makeRotationY(Math.atan2(dx,dy));
        matrix.scale(new T.Vector3(1,Math.max(.001,top-bottom),1));matrix.setPosition(x+dx*.5,(top+bottom)/2,y+dy*.5);
        positions.push({x,y});matrices.push(matrix);
      }
    }
    if(!positions.length)return;
    this.bankGeometry=new T.PlaneGeometry(1,1);this.bankMaterial=new T.MeshStandardMaterial({color:'#75694f',roughness:1,side:T.DoubleSide});
    const mesh=new T.InstancedMesh(this.bankGeometry,this.bankMaterial,positions.length);mesh.userData.environment='shore-bank';mesh.frustumCulled=false;
    for(const [i,matrix] of matrices.entries()){mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new T.Color(1,1,1));}
    this.root.add(mesh);this.batches.push({mesh,positions,matrices,ground:false});
  }
  update(view){
    this.bind(view);
    this.surfaces.update(view);this.resources.update(view);
    const revision=Math.floor(view.game.time*3)+':'+view.game.debugRevealMap;
    if(this.visibilityRevision!==revision){
      this.visibilityRevision=revision;const color=new T.Color(),hidden=new T.Matrix4().makeScale(0,0,0);
      for(const {mesh,positions,matrices,ground} of this.batches){
        positions.forEach((p,i)=>{
          const known=view.game.explored(view.localId,p.x,p.y),visible=view.game.visible(view.localId,p.x,p.y);
          mesh.setMatrixAt(i,!ground&&!known?hidden:matrices[i]);
          const shade=!known?.018:visible?1:.24;mesh.setColorAt(i,color.setRGB(shade,shade,shade));
        });mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
      }
    }
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    this.surfaces?.dispose();this.resources?.dispose();this.bankGeometry?.dispose();this.bankMaterial?.dispose();
    for(const {mesh} of this.batches){mesh.removeFromParent();mesh.dispose();}this.batches=[];this.groundMeshes=[];
    const geometries=new Set(),materials=new Set(),textures=new Set();
    for(const {scene} of this.templates.values())scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [o.material].flat()){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}}});
    for(const t of textures){t.dispose();t.source?.data?.close?.();}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.templates.clear();
  }
}
