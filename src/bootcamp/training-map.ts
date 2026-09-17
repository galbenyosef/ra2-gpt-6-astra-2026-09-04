/** Deterministic terrain shared by the native view, 3D scene and actual simulation. */
import {customMapToMapData, type CustomMapDocument} from '../custom-maps';
export const TRAINING_MAP_ID='bootcamp-field';
export function createTrainingMap(){
  const width=48,height=40,cells:CustomMapDocument['cells']=Array(width*height).fill('land');
  for(let y=0;y<height;y++)for(let x=32;x<width;x++)cells[y*width+x]='water';
  for(let y=5;y<19;y++)cells[y*width+22]='road';
  for(let y=19;y<=20;y++)for(let x=22;x<=23;x++)cells[y*width+x]='road';
  for(let x=24;x<31;x++)cells[20*width+x]='road';
  for(let y=4;y<10;y++)for(let x=3;x<7;x++)cells[y*width+x]='cliff';
  for(let y=24;y<28;y++)for(let x=15;x<19;x++)cells[y*width+x]='ore';
  const map=customMapToMapData({format:'ra2-web-map',version:1,name:'素材训练场',width,height,theater:'temperate',cells,spawns:[{x:12,y:13},{x:12,y:33}]});
  map.id=TRAINING_MAP_ID;map.nameEn='Asset Training Field';map.source='已有素材搭建的训练场';
  map.scenery=[{x:6,y:14,type:'TREE22'},{x:7,y:24,type:'TREE10'},{x:26,y:12,type:'TREE26'},{x:29,y:27,type:'TREE22'},{x:25,y:31,type:'TREE10'},{x:20,y:5,type:'TREE26'}];
  map.environmentProps=[
    ...map.scenery.map(p=>({id:p.type.toLowerCase(),x:p.x,y:p.y})),
    {id:'curved-road',x:22.5,y:19.5},
  ];
  // The ramp/rock exhibit stays blocked in both renderers, rather than inventing height pathfinding.
  for(let y=5;y<10;y++)for(let x=3;x<7;x++){
    const i=y*width+x;map.elevations[i]=1;map.tiles[i].elevation=1;
  }
  for(let x=3;x<7;x++)map.environmentProps.push({id:'ramp',x,y:4});
  return map;
}
