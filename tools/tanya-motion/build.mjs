// The GLB buffer/accessor writer and clip export share state; kept together for binary-layout review despite exceeding 5 KB.
// Build one self-contained GLB containing shared geometry and SHP-referenced clips.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createPoser} from './poses.mjs';import{sequences,fps,isOnce,sourcePhase}from'./catalog.mjs';
import {motionCycles} from './locomotion.mjs';
import {createPropSampler} from './props.mjs';
import {actionNotes,weaponVisible} from './action-keys.mjs';
globalThis.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init);}};
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node build.mjs RIG_TRIAL_DIRECTORY OUTPUT_DIRECTORY');
async function read(name){const bytes=await fs.readFile(path.join(input,name)),n=bytes.readUInt32LE(12);return{bytes,json:JSON.parse(bytes.subarray(20,20+n)),bin:bytes.subarray(28+n)};}
async function load(file){const g=structuredClone(file.json);g.images=[];g.textures=[];g.materials=[];for(const m of g.meshes)for(const p of m.primitives)delete p.material;g.buffers[0].uri='data:application/octet-stream;base64,'+file.bin.toString('base64');return new GLTFLoader().parseAsync(JSON.stringify(g),'');}
const source=await read('rigged.glb'),model=await load(source),poser=createPoser(model.scene),props=createPropSampler(poser);
const g=structuredClone(source.json);g.animations=[];const chunks=[source.bin];let byteLength=source.bin.length;
function accessor(values,size){const data=Buffer.alloc(values.length*4);values.forEach((v,i)=>{if(!Number.isFinite(v))throw Error('Nonfinite animation value');data.writeFloatLE(v,i*4);});const view=g.bufferViews.length;g.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:data.length});chunks.push(data);byteLength+=data.length;const a={bufferView:view,componentType:5126,count:values.length/size,type:{1:'SCALAR',3:'VEC3',4:'VEC4'}[size]};if(size===1){a.min=[Math.min(...values)];a.max=[Math.max(...values)];}return g.accessors.push(a)-1;}
const regionResult=spawnSync(process.env.RA2_PYTHON||'python3',[fileURLToPath(new URL('./mesh-regions.py',import.meta.url)),path.join(input,'rigged.glb')],{encoding:'utf8'});
if(regionResult.status!==0)throw Error('Region extraction requires Python + Pillow: '+regionResult.stderr);
const regions=JSON.parse(regionResult.stdout),weaponFaces=new Set(regions.weaponFaces),primitive=g.meshes[0].primitives[0],sourceIndex=model.scene.getObjectByProperty('isSkinnedMesh',true).geometry.index.array;
const body=[],weapons={Left:[],Right:[]},positions=model.scene.getObjectByProperty('isSkinnedMesh',true).geometry.attributes.position;
for(let f=0;f<sourceIndex.length/3;f++){const face=sourceIndex.slice(f*3,f*3+3),x=face.reduce((sum,i)=>sum+positions.getX(i),0);(weaponFaces.has(f)?weapons[x>0?'Left':'Right']:body).push(...face);}
function indices(values){const bytes=Buffer.alloc(values.length*4);values.forEach((v,i)=>bytes.writeUInt32LE(v,i*4));const view=g.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:bytes.length})-1;chunks.push(bytes);byteLength+=bytes.length;return g.accessors.push({bufferView:view,componentType:5125,count:values.length,type:'SCALAR'})-1;}
primitive.attributes._TEAM_MASK=accessor(regions.teamMask,1);primitive.indices=indices(body);g.meshes[0].name='TanyaBody';
const weaponGroup=g.nodes.push({name:'TanyaPistols',children:[],extras:{role:'weapons'}})-1;g.scenes[g.scene||0].nodes.push(weaponGroup);
const weaponNodes={};for(const side of ['Left','Right']){
 const attributes={...primitive.attributes};delete attributes.JOINTS_0;delete attributes.WEIGHTS_0;
 const mesh=g.meshes.push({name:'Tanya'+side+'Pistol',primitives:[{...primitive,attributes,indices:indices(weapons[side])}]})-1;
 weaponNodes[side]=g.nodes.push({name:'Tanya'+side+'Pistol',mesh,extras:{role:'pistol',side}})-1;g.nodes[weaponGroup].children.push(weaponNodes[side]);
}
const nodes=new Map(g.nodes.map((n,i)=>[n.name,i]));
for(const[name,[,frames]]of Object.entries({...sequences,swimstop:[0,6,0],swimstart:[0,6,0]})){
 const duration=motionCycles[name]?.duration??frames/fps,once=isOnce(name)||motionCycles[name]?.once;
 // Include every exact source key as well as 60 Hz interpolation and the held endpoint.
 const phases=[...new Set([...Array.from({length:Math.ceil(duration*60)+1},(_,i)=>i/Math.ceil(duration*60)),...Array.from({length:frames},(_,i)=>sequences[name]?sourcePhase(name,i):i/(frames-1))])].sort((a,b)=>a-b),times=phases.map(p=>p*duration);
 const data=Object.fromEntries(Object.keys(poser.bones).map(n=>[n,{rotation:[],translation:[]}])),propData={Left:{rotation:[],translation:[],scale:[]},Right:{rotation:[],translation:[],scale:[]}};
 props.prepare(name);
 function append(values,out){if(values.length===4&&out.length&&values.reduce((s,v,j)=>s+v*out[out.length-4+j],0)<0)values=values.map(v=>-v);out.push(...values);}
 for(const samplePhase of phases){
  const phase=samplePhase===1&&!once?0:samplePhase;poser.pose(name,phase);
  for(const[n,b]of Object.entries(poser.bones)){append(b.quaternion.clone().normalize().toArray(),data[n].rotation);data[n].translation.push(...b.position.toArray());}
  for(const side of ['Left','Right'])for(const[prop,values]of Object.entries(props.sample(name,side,phase)))append(values,propData[side][prop]);
 }
 const time=accessor(times,1),clip={name,samplers:[],channels:[],extras:{sourceSequence:sequences[name],fps,loop:!once,provenance:'SHP-referenced authored skeletal reconstruction; not recovered original animation'}};
 for(const[n,tracks]of Object.entries(data))for(const[prop,values]of Object.entries(tracks)){
  if(prop==='translation'&&n!=='Hips')continue;
  const sampler=clip.samplers.push({input:time,output:accessor(values,prop==='rotation'?4:3),interpolation:'LINEAR'})-1;clip.channels.push({sampler,target:{node:nodes.get(n),path:prop}});
 }
 for(const side of ['Left','Right'])for(const[prop,values]of Object.entries(propData[side]))clip.channels.push({sampler:clip.samplers.push({input:time,output:accessor(values,prop==='rotation'?4:3),interpolation:prop==='scale'?'STEP':'LINEAR'})-1,target:{node:weaponNodes[side],path:prop}});
 clip.extras.sourceObservation=actionNotes[name]||'alias / authored transition';
 g.animations.push(clip);
}
// The service made the diffuse map emissive. Restore ordinary lit material response.
for(const m of g.materials){delete m.emissiveTexture;delete m.emissiveFactor;m.pbrMetallicRoughness={...m.pbrMetallicRoughness,metallicFactor:0,roughnessFactor:.85};delete m.extensions;}
g.extensionsUsed=(g.extensionsUsed||[]).filter(x=>!['KHR_materials_specular','KHR_materials_ior'].includes(x));g.buffers[0].byteLength=byteLength;
g.asset.extras={...g.asset.extras,motionSource:'Original TanyaSequence frame layout; authored skeletal targets; source-key action revisions and independent rigid pistol tracks',sourceFps:fps};
const json=Buffer.from(JSON.stringify(g)),jp=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),bin=Buffer.concat(chunks),head=Buffer.alloc(20),bh=Buffer.alloc(8);head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(28+jp.length+bin.length,8);head.writeUInt32LE(jp.length,12);head.write('JSON',16);bh.writeUInt32LE(bin.length,0);bh.write('BIN\0',4);const result=Buffer.concat([head,jp,bh,bin]);
await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'tanya-actions.glb'),result);
const report={sourceTask:'01a0a574-e2df-72e1-b22d-0cc4b42b6f2f',sourceSha256:crypto.createHash('sha256').update(source.bytes).digest('hex'),sha256:crypto.createHash('sha256').update(result).digest('hex'),bytes:result.length,triangles:29827,joints:24,clips:g.animations.length,sequences,fps,motionCycles,motionRevision:'all-source-actions-v4',weaponTriangles:(weapons.Left.length+weapons.Right.length)/3,weaponVisibility:Object.fromEntries(Object.keys(sequences).map(name=>[name,{left:weaponVisible(name,'Left'),right:weaponVisible(name,'Right')}])),actionReference:'tools/tanya-motion/action-reference.md',teamRemap:'_TEAM_MASK torso eligibility plus texture olive-cloth gate',crawlReference:'art.ini Crawl=86,6,6; N 86–91, W 98–103, S 110–115 manually inspected; hand props uncertain; crawl/prone represented without extended pistols',unmappedSourceRanges:[[362,409],[458,505],[611,618]],limitations:['Poses reconstructed by reference, not pixel-exact original motion capture','Preview clock is 12 fps, not original-executable timing verification','Original PBR normal and roughness maps not returned by rigging service','Source-referenced rigid pistols; fingers remain in a closed grip without finger joints; obscured depth, fixed-sequence facing and underwater limbs are inferred']};
await fs.writeFile(path.join(output,'motion-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({bytes:result.length,clips:g.animations.length,output}));
