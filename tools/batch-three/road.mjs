// Reconstruct a 2x2 TMP-referenced road bend with exact ground and road ports.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const req=createRequire(new URL('../model-opt/package.json',import.meta.url));
const {Document,NodeIO}=await import(req.resolve('@gltf-transform/core'));
const {ALL_EXTENSIONS}=await import(req.resolve('@gltf-transform/extensions'));
const sharp=(await import(req.resolve('sharp'))).default;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const root='assets/hd/batch-three',cache='.cache/batch-three/curved-road',N=1024;
await fs.mkdir(cache,{recursive:true});
const raw=await sharp(root+'/references/curved-road.png').resize(N,N).removeAlpha().raw().toBuffer();
async function albedo(path){const doc=await io.read(path);return sharp(doc.getRoot().listMaterials()[0].getBaseColorTexture().getImage()).resize(N,N).removeAlpha().raw().toBuffer();}
const grass=await albedo('assets/hd/environment/grass.glb');
const road=await albedo('assets/hd/batch-two/dirt-road.glb');
const at=(data,x,y,c)=>data[(Math.max(0,Math.min(N-1,y))*N+Math.max(0,Math.min(N-1,x)))*3+c];
const cellTexel=i=>Math.round((i%(N/2))/(N/2-1)*(N-1));
// The source curve supplies topology and local worn detail. Warp the existing
// straight material around its quarter-circle center so lane width, grass grain
// and rut scale stay continuous; retain the authored bend's detail at its middle.
const generated=Buffer.from(raw);
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
 const X=x/(N-1)*2-1,Z=y/(N-1)*2-1,radius=Math.hypot(1-X,Z+1);
 const angle=Math.atan2(Z+1,1-X),u=2-radius,v=(angle*1.5)%1;
 const onRoad=u>=0&&u<=1,edgeFade=Math.min(1,Math.min(angle,Math.PI/2-angle)/.38);
 const laneFade=Math.max(0,1-Math.abs(radius-1.5)/.42),detailWeight=onRoad?.22*edgeFade*laneFade:0;
 for(let c=0;c<3;c++){
  const base=onRoad?at(road,Math.round(u*(N-1)),Math.round(v*(N-1)),c):at(grass,cellTexel(x),cellTexel(y),c);
  const i=(y*N+x)*3+c;raw[i]=Math.round(base*(1-detailWeight)+generated[i]*detailWeight);
 }
}
const expected=(edge,i,c)=>{
 const t=cellTexel(i);
 if(edge==='north')return at(i<N/2?road:grass,t,N-1,c);
 if(edge==='east')return i>=N/2?at(road,N-1-t,N-1,c):at(grass,0,t,c);
 if(edge==='south')return at(grass,t,0,c);
 return at(grass,N-1,t,c);
};
// Blend 40 texels; the very last texel is the actual neighboring GLB albedo.
for(let i=0;i<N;i++)for(let k=0;k<40;k++)for(let c=0;c<3;c++){
 const weight=(1-k/40)**2;
 for(const [edge,x,y]of[['north',i,k],['east',N-1-k,i],['south',i,N-1-k],['west',k,i]]){
  const index=(y*N+x)*3+c;raw[index]=Math.round(raw[index]*(1-weight)+expected(edge,i,c)*weight);
 }
}
// Enforce the outermost rows after corner-band blending. Corner texels join four
// differently sampled tiles, so measurements exclude the single corner texel.
for(let i=1;i<N-1;i++)for(let c=0;c<3;c++)for(const [edge,x,y]of[['north',i,0],['east',N-1,i],['south',i,N-1],['west',0,i]])raw[(y*N+x)*3+c]=expected(edge,i,c);
const png=await sharp(raw,{raw:{width:N,height:N,channels:3}}).png().toBuffer();
await fs.writeFile(cache+'/conditioned-albedo.png',png);
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('droadc02 bend');doc.getRoot().setDefaultScene(scene);
const ac=(name,type,array)=>doc.createAccessor(name).setType(type).setArray(array).setBuffer(buffer);
const texture=doc.createTexture('curved road albedo').setImage(png).setMimeType('image/png');
const material=doc.createMaterial('dirt and grass').setBaseColorTexture(texture).setBaseColorFactor([.65,.70,.50,1]).setRoughnessFactor(.96).setMetallicFactor(0);
const p=doc.createPrimitive().setAttribute('POSITION',ac('position','VEC3',new Float32Array([-1,0,-1,1,0,-1,-1,0,1,1,0,1])))
 .setAttribute('NORMAL',ac('normal','VEC3',new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0])))
 .setAttribute('TANGENT',ac('tangent','VEC4',new Float32Array([1,0,0,-1,1,0,0,-1,1,0,0,-1,1,0,0,-1])))
 .setAttribute('TEXCOORD_0',ac('uv','VEC2',new Float32Array([0,0,1,0,0,1,1,1])))
 .setIndices(ac('indices','SCALAR',new Uint16Array([0,2,1,1,2,3]))).setMaterial(material);
scene.addChild(doc.createNode('CurvedRoad').setMesh(doc.createMesh('CurvedRoad').addPrimitive(p)));
const bytes=await io.writeBinary(doc);await fs.writeFile(root+'/curved-road.glb',bytes);await fs.writeFile(cache+'/master.glb',bytes);
const edgeChecks={};for(const edge of ['north','east','south','west']){
 let maxDifference=0;
 for(let i=1;i<N-1;i++)for(let c=0;c<3;c++){
  const [x,y]=edge==='north'?[i,0]:edge==='east'?[N-1,i]:edge==='south'?[i,N-1]:[0,i];
  maxDifference=Math.max(maxDifference,Math.abs(raw[(y*N+x)*3+c]-expected(edge,i,c)));
 }edgeChecks[edge]=maxDifference;
}
const record={id:'curved-road',file:'curved-road.glb',source:'temperate:177 / droadc02.tem',footprintCells:[2,2],triangles:2,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),up:'+Y',bounds:[[-1,0,-1],[1,0,1]],ports:[{edge:'north',center:[-.5,0,-1],widthCells:1},{edge:'east',center:[1,0,.5],widthCells:1}],edgeMaxDifference:edgeChecks,textureSize:[N,N],textureFormat:'embedded lossless PNG',pipeline:'ImageGen source-guided albedo + authored flat ground quad; no Meshy',master:cache+'/master.glb',limitations:['One 90-degree bend; quarter-turn placement supported','Flat terrain intentionally uses 2 triangles, not redundant 30K geometry','Four corner texels excluded from edge comparison','Mipmap filtering and distant texture contrast require browser review']};
await fs.writeFile(root+'/curved-road.json',JSON.stringify(record,null,2)+'\n');console.log(record);
