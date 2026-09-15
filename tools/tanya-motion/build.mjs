// Build one self-contained GLB containing shared geometry and SHP-referenced clips.
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createPoser} from './poses.mjs';import{sequences,fps,isOnce}from'./catalog.mjs';
globalThis.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init);}};
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node build.mjs RIG_TRIAL_DIRECTORY OUTPUT_DIRECTORY');
async function read(name){const bytes=await fs.readFile(path.join(input,name)),n=bytes.readUInt32LE(12);return{bytes,json:JSON.parse(bytes.subarray(20,20+n)),bin:bytes.subarray(28+n)};}
async function load(file){const g=structuredClone(file.json);g.images=[];g.textures=[];g.materials=[];for(const m of g.meshes)for(const p of m.primitives)delete p.material;g.buffers[0].uri='data:application/octet-stream;base64,'+file.bin.toString('base64');return new GLTFLoader().parseAsync(JSON.stringify(g),'');}
const source=await read('rigged.glb'),running=await read('running.glb'),model=await load(source),run=await load(running),poser=createPoser(model.scene,run.animations[0]);
const g=structuredClone(source.json);g.animations=[];const chunks=[source.bin];let byteLength=source.bin.length;
function accessor(values,size){const data=Buffer.alloc(values.length*4);values.forEach((v,i)=>{if(!Number.isFinite(v))throw Error('Nonfinite animation value');data.writeFloatLE(v,i*4);});const view=g.bufferViews.length;g.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:data.length});chunks.push(data);byteLength+=data.length;const a={bufferView:view,componentType:5126,count:values.length/size,type:{1:'SCALAR',3:'VEC3',4:'VEC4'}[size]};if(size===1){a.min=[Math.min(...values)];a.max=[Math.max(...values)];}return g.accessors.push(a)-1;}
const nodes=new Map(g.nodes.map((n,i)=>[n.name,i]));
for(const[name,[,frames]]of Object.entries(sequences)){
 const duration=frames/fps,once=isOnce(name),samples=Math.max(2,frames+1),times=Array.from({length:samples},(_,i)=>i*duration/(samples-1));
 const data=Object.fromEntries(Object.keys(poser.bones).map(n=>[n,{rotation:[],translation:[]}]));
 for(let i=0;i<samples;i++){
  const phase=i===samples-1?(once?1:0):once&&frames>1?i/(frames-1):i/frames;
  poser.pose(name,phase);
  for(const[n,b]of Object.entries(poser.bones)){
   const q=b.quaternion.clone().normalize().toArray(),prev=data[n].rotation;
   if(prev.length&&q.reduce((s,v,j)=>s+v*prev[prev.length-4+j],0)<0)q.forEach((v,j)=>q[j]=-v);
   prev.push(...q);data[n].translation.push(...b.position.toArray());
  }
 }
 const time=accessor(times,1),clip={name,samplers:[],channels:[],extras:{sourceSequence:sequences[name],fps,loop:!once,provenance:'SHP-referenced authored skeletal reconstruction; not recovered original animation'}};
 for(const[n,tracks]of Object.entries(data))for(const[prop,values]of Object.entries(tracks)){
  if(prop==='translation'&&n!=='Hips')continue;
  const sampler=clip.samplers.push({input:time,output:accessor(values,prop==='rotation'?4:3),interpolation:'LINEAR'})-1;clip.channels.push({sampler,target:{node:nodes.get(n),path:prop}});
 }
 g.animations.push(clip);
}
// The service made the diffuse map emissive. Restore ordinary lit material response.
for(const m of g.materials){delete m.emissiveTexture;delete m.emissiveFactor;m.pbrMetallicRoughness={...m.pbrMetallicRoughness,metallicFactor:0,roughnessFactor:.85};delete m.extensions;}
g.extensionsUsed=(g.extensionsUsed||[]).filter(x=>!['KHR_materials_specular','KHR_materials_ior'].includes(x));g.buffers[0].byteLength=byteLength;
g.asset.extras={...g.asset.extras,motionSource:'Original TanyaSequence frame layout; authored skeletal targets; Meshy gait retimed',sourceFps:fps};
const json=Buffer.from(JSON.stringify(g)),jp=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),bin=Buffer.concat(chunks),head=Buffer.alloc(20),bh=Buffer.alloc(8);head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(28+jp.length+bin.length,8);head.writeUInt32LE(jp.length,12);head.write('JSON',16);bh.writeUInt32LE(bin.length,0);bh.write('BIN\0',4);const result=Buffer.concat([head,jp,bh,bin]);
await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'tanya-actions.glb'),result);
const report={sourceTask:'01a0a574-e2df-72e1-b22d-0cc4b42b6f2f',sourceSha256:crypto.createHash('sha256').update(source.bytes).digest('hex'),sha256:crypto.createHash('sha256').update(result).digest('hex'),bytes:result.length,triangles:29827,joints:24,clips:g.animations.length,sequences,fps,unmappedSourceRanges:[[362,409],[458,505],[611,618]],limitations:['Poses reconstructed by reference, not pixel-exact original motion capture','Preview clock is 12 fps, not original-executable timing verification','Original PBR normal and roughness maps not returned by rigging service','Pistols remain part of the skinned mesh; individual fingers and weapon drops need separate rigging']};
await fs.writeFile(path.join(output,'motion-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({bytes:result.length,clips:g.animations.length,output}));
