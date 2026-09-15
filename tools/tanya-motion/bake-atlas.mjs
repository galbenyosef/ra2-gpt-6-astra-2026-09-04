// Bake skeletal poses to packed RGBA sprite frames using the game's isometric camera.
import * as T from 'three';import{clone}from'three/addons/utils/SkeletonUtils.js';import{sequences,fps,sourceFacing}from'./catalog.mjs';
export async function bakeAtlas(gltf,progress){
 const model=clone(gltf.scene),scene=new T.Scene(),group=new T.Group();group.add(model);scene.add(group);const mixer=new T.AnimationMixer(model),clips=Object.fromEntries(gltf.animations.map(c=>[c.name,c]));
 scene.add(new T.HemisphereLight(0xe8efff,0x4d5560,2));const light=new T.DirectionalLight(0xfff5e8,2.4);light.position.set(3,5,4);scene.add(light);
 const r=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setClearColor(0,0);r.localClippingEnabled=true;
 const W=320,H=280,ax=160,ay=200,density=4,ppu=80;r.setSize(W,H);const camera=new T.OrthographicCamera(-ax/ppu,(W-ax)/ppu,ay/ppu,-(H-ay)/ppu,.01,100);camera.position.set(10,10*Math.sqrt(2/3),10);camera.lookAt(0,0,0);
 const materials=[];model.updateMatrixWorld(true);model.traverse(o=>{if(!o.isSkinnedMesh)return;const a=o.geometry.attributes.position,heights=[];for(let i=0;i<a.count;i++)heights.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).y/1.7);o.geometry=o.geometry.clone();o.geometry.setAttribute('remapHeight',new T.Float32BufferAttribute(heights,1));
 const original=o.material.clone(),mask=new T.MeshBasicMaterial({map:original.map,side:T.DoubleSide});
 mask.onBeforeCompile=s=>{s.vertexShader='attribute float remapHeight; varying float vRemapHeight;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRemapHeight=remapHeight;');s.fragmentShader='varying float vRemapHeight;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','if(vRemapHeight<0.56||vRemapHeight>0.79||max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))>0.20)discard; outgoingLight=vec3(0.55);\n#include <opaque_fragment>');};o.material=original;materials.push({o,original,mask});});
 const frameCanvas=document.createElement('canvas');frameCanvas.width=W;frameCanvas.height=H;const ctx=frameCanvas.getContext('2d',{willReadFrequently:true});
 const atlas=document.createElement('canvas'),maskAtlas=document.createElement('canvas');atlas.width=maskAtlas.width=2048;atlas.height=maskAtlas.height=8192;const dest=atlas.getContext('2d'),maskDest=maskAtlas.getContext('2d');
 const mapping=Array(619).fill(null);for(const[name,[start,count,stride]]of Object.entries(sequences))for(let dir=0;dir<(stride?8:1);dir++)for(let frame=0;frame<count;frame++){const i=start+dir*stride+frame;if(!mapping[i])mapping[i]={name,dir:stride?dir:sourceFacing(name),frame};}
 let x=0,y=0,rowH=0,rects=[],active;const blank=[0,0,1,1,0,0];const bounds=[];
 for(let i=0;i<619;i++){
  const m=mapping[i];if(!m){rects.push(blank);continue;}
  if(active)active.stop();active=mixer.clipAction(clips[m.name]);active.reset().play();mixer.setTime(m.frame/fps);group.rotation.y=-3*Math.PI/4+m.dir*Math.PI/4;
  const wet=m.name==='swim'||m.name==='tread'||m.name.startsWith('wet');group.position.y=wet&&m.name!=='swim'?-.90:0;
  for(const mat of materials){mat.original.clippingPlanes=mat.mask.clippingPlanes=wet?[new T.Plane(new T.Vector3(0,1,0),.02)]:[];mat.o.material=mat.original;}
  r.render(scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(r.domElement,0,0);const data=ctx.getImageData(0,0,W,H).data;let l=W,t=H,rr=0,b=0;
  for(let py=0;py<H;py++)for(let px=0;px<W;px++)if(data[(py*W+px)*4+3]>8){l=Math.min(l,px);rr=Math.max(rr,px);t=Math.min(t,py);b=Math.max(b,py);}
  if(rr<l){rects.push(blank);continue;}if(l<2||t<2||rr>=W-2||b>=H-2)throw Error(`Model cropped: ${m.name} / ${m.dir} / ${m.frame}`);
  l-=2;t-=2;rr+=2;b+=2;const w=rr-l+1,h=b-t+1;if(x+w>2048){x=0;y+=rowH+2;rowH=0;}if(y+h>8192)throw Error('Atlas exceeds packing height');dest.drawImage(frameCanvas,l,t,w,h,x,y,w,h);
  for(const mat of materials)mat.o.material=mat.mask;r.render(scene,camera);maskDest.drawImage(r.domElement,l,t,w,h,x,y,w,h);rects.push([x,y,w,h,ax-l,ay-t]);bounds.push({frame:i,action:m.name,rect:[l,t,w,h]});x+=w+2;rowH=Math.max(rowH,h);
  if(i%12===0){progress(`烘焙 ${i+1}/619`);await new Promise(requestAnimationFrame);}
 }
 const height=y+rowH,out=document.createElement('canvas'),outMask=document.createElement('canvas');out.width=outMask.width=2048;out.height=outMask.height=height;out.getContext('2d').drawImage(atlas,0,0);outMask.getContext('2d').drawImage(maskAtlas,0,0);
 const metadata={src:'/sprites/tany.png',remapMaskSrc:'/sprites/tany-remap.png',width:2048,height,frameWidth:W,frameHeight:H,frames:619,columns:1,anchorX:ax,anchorY:ay,pixelRatio:density,facings:8,facingConvention:'ra2-shp',hdMotion:'infantry',animationClock:'source',animationFps:fps,animationSource:'SHP-referenced skeletal clips; approximated 3D poses',sequences,frameRects:rects,unmappedFrames:mapping.flatMap((m,i)=>m?[]:[i])};
 const response=await fetch('/bake-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:out.toDataURL(),mask:outMask.toDataURL(),metadata,bounds})});if(!response.ok)throw Error('Local atlas write failed: '+response.status);
 r.dispose();for(const m of materials){m.o.geometry.dispose();m.original.dispose();m.mask.dispose();}return `已保存 ${mapping.filter(Boolean).length} 个已命名原版帧位，${2048}×${height}；地图可刷新。`;
}
