// Instanced ore-bearing stones: quantity, visibility and depletion follow the actual engine resource array.
import * as T from 'three';
import {heightStep} from './camera.js';
const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export class ResourceScene {
  root=new T.Group();batches=[];
  constructor(view){
    this.cells=[];
    view.map.cells.forEach((type,index)=>{if(type==='ore'||type==='gem')this.cells.push({index,type,x:index%view.map.width,y:Math.floor(index/view.map.width)});});
    this.geometry=new T.IcosahedronGeometry(1,1);this.geometry.computeVertexNormals();
    this.material=new T.MeshStandardMaterial({roughness:.87,metalness:.12,flatShading:true});
    // A dark low stone base and smaller mineral facets share each cluster's quantity threshold.
    for(const mineral of [false,true]){
      const mesh=new T.InstancedMesh(this.geometry,this.material,this.cells.length*24);
      mesh.userData.environment=mineral?'mineral-facets':'ore-stones';mesh.frustumCulled=false;
      const samples=[];const color=new T.Color();
      for(const cell of this.cells)for(let j=0;j<24;j++){
        const seed=cell.index*43+j*7,r=random(seed),angle=random(seed+1)*Math.PI*2;
        const radius=Math.sqrt(random(seed+2))*.38;
        const size=.04+random(seed+3)*.05;
        const sample={cell,j,x:cell.x+Math.cos(angle)*radius,y:cell.y+Math.sin(angle)*radius,size,angle,mineral};samples.push(sample);
        color.set(cell.type==='gem'?(mineral?['#5db9b3','#9474b9','#80c8ba'][j%3]:'#474950'):(mineral?['#c79d36','#e2bd5c','#9a752b'][j%3]:['#665c41','#82704b','#514c3d'][j%3]));
        color.multiplyScalar(.82+r*.28);mesh.setColorAt(samples.length-1,color);
      }
      this.root.add(mesh);this.batches.push({mesh,samples});
    }
  }
  update(view){
    const state=this.cells.map(c=>view.game.visible(view.localId,c.x,c.y)?Math.max(0,view.game.ore[c.index]):0).join(':');
    if(this.state===state)return;this.state=state;
    const dummy=new T.Object3D();
    for(const {mesh,samples} of this.batches){
      for(const [i,p] of samples.entries()){
        const amount=Math.max(0,view.game.ore[p.cell.index]);
        const ratio=Math.min(1,amount/(p.cell.type==='gem'?8000:5000));
        const visible=view.game.visible(view.localId,p.cell.x,p.cell.y)&&ratio>0&&p.j<Math.ceil(ratio*24);
        const scale=visible?p.size*(.65+.35*Math.sqrt(ratio)):0;
        dummy.position.set(p.x,view.elevation(p.cell.x,p.cell.y)*heightStep+scale*(p.mineral?.75:.36),p.y);
        dummy.rotation.set(.15*Math.sin(p.angle),p.angle,.12*Math.cos(p.angle));
        dummy.scale.set(scale*(p.mineral?.66:1.25),scale*(p.mineral?.5:.7),scale*(p.mineral?.6:1));
        dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
  }
  dispose(){for(const {mesh} of this.batches)mesh.dispose();this.geometry.dispose();this.material.dispose();this.root.clear();}
}
