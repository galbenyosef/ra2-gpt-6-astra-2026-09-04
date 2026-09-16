// One cloth selection for 3D color and the baked Canvas mask; follows the skin.
// _TEAM_MASK is computed in source rest coordinates, not after object scaling.
import * as T from 'three';
export function teamMaterial(source,color,mask=false){
 const material=source.clone();const uniform={value:new T.Color(color)};
 material.onBeforeCompile=s=>{
  s.uniforms.ra2TeamColor=uniform;
  s.vertexShader='attribute float _team_mask; varying float vTeamEligible;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTeamEligible=_team_mask;');
  s.fragmentShader='uniform vec3 ra2TeamColor; varying float vTeamEligible;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   bool cloth=vTeamEligible>0.5 && max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))<0.20 && diffuseColor.g>diffuseColor.r*0.50;
   ${mask?'if(!cloth)discard;':''}
   if(cloth){float shade=0.24+1.35*dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));diffuseColor.rgb=ra2TeamColor*shade;}`);
 };
 material.customProgramCacheKey=()=>mask?'ra2-cloth-mask-v3':'ra2-cloth-color-v3';
 return {material,setColor:color=>uniform.value.set(color)};
}

// Only the authored character is tinted below water; terrain remains original art.
export function submergedMaterial(source,color,mask=false){
 const result=teamMaterial(source,color,mask),material=result.material,compile=material.onBeforeCompile;
 material.transparent=true;material.depthWrite=false;
 material.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),-.02),new T.Plane(new T.Vector3(0,1,0),1.10)];
 material.onBeforeCompile=s=>{
  compile(s);s.vertexShader='varying float vRa2WaterY;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvRa2WaterY=(modelMatrix*vec4(transformed,1.0)).y;');
  s.fragmentShader='varying float vRa2WaterY;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>',`diffuseColor.a*=0.38*smoothstep(-1.10,0.0,vRa2WaterY);${mask?'':'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.08,0.18,0.34),0.65);'}\n#include <alphatest_fragment>`);
 };
 material.customProgramCacheKey=()=>mask?'ra2-submerged-mask-v4':'ra2-submerged-color-v4';return result;
}
