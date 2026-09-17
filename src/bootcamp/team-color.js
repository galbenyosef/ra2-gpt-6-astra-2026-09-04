// Shared embedded-mask adapter. Paint uniforms belong to each instance; geometry and textures are shared.
import * as T from 'three';
export async function prepareTeamMasks(gltf) {
 const materials=new Set(),masks=new Map();
 gltf.scene.traverse(o=>{if(o.isMesh)for(const material of [o.material].flat())materials.add(material);});
 for(const material of materials) {
  const spec=material.userData.ra2TeamColor;if(!spec)continue;
  const mask=await gltf.parser.loadImageSource(spec.maskImage,new T.TextureLoader());
  mask.flipY=false;mask.colorSpace=T.NoColorSpace;mask.wrapS=material.map.wrapS;mask.wrapT=material.map.wrapT;
  masks.set(material,mask);
 }
 if(!masks.size)throw Error('Model has no embedded player-color mask');
 return masks;
}
export function cloneTeamMaterial(source,mask,uniform,showMask={value:false}) {
 const material=source.clone();
 if(!mask)return material;
 material.onBeforeCompile=shader=>{
  shader.uniforms.ra2PlayerColor=uniform;shader.uniforms.ra2PlayerMask={value:mask};shader.uniforms.ra2ShowMask=showMask;
  shader.fragmentShader='uniform vec3 ra2PlayerColor; uniform sampler2D ra2PlayerMask; uniform bool ra2ShowMask;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float ra2Mask=texture2D(ra2PlayerMask,vMapUv).r;
   float ra2Chroma=max(0.0,diffuseColor.r-min(diffuseColor.g,diffuseColor.b));
   diffuseColor.rgb+=ra2Mask*ra2Chroma*(ra2PlayerColor-vec3(1.0,0.0,0.0));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\nif(ra2ShowMask)gl_FragColor=vec4(vec3(ra2Mask),1.0);');
 };
 material.customProgramCacheKey=()=> 'ra2-embedded-team-mask-v1';return material;
}
export async function applyTeamColor(gltf,color='#ff0000') {
 const masks=await prepareTeamMasks(gltf),uniform={value:new T.Color(color)},showMask={value:false};let materialCount=0;
 gltf.scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const next=[mesh.material].flat().map(source=>{const mask=masks.get(source);if(!mask)return source;materialCount++;return cloneTeamMaterial(source,mask,uniform,showMask);});
  mesh.material=Array.isArray(mesh.material)?next:next[0];
 });
 return {setColor:color=>uniform.value.set(color),showMask:value=>showMask.value=value,materialCount};
}
