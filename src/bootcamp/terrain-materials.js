// World-space surface detail over existing GLBs; shoreline masks read the shared map only.
import * as T from 'three';
const noise=`
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}
`;
export class TerrainMaterials {
  materials=[];time={value:0};
  constructor(map){
    const data=new Uint8Array(map.width*map.height*4);
    map.cells.forEach((cell,i)=>{data[i*4]=cell==='water'?255:0;data[i*4+1]=cell==='void'?0:255;data[i*4+2]=cell==='road'?255:0;data[i*4+3]=0;});
    this.mask=new T.DataTexture(data,map.width,map.height);this.mask.needsUpdate=true;
    this.size=new T.Vector2(map.width,map.height);
    this.resourceCells=map.cells.flatMap((type,index)=>type==='ore'||type==='gem'?[{type,index}]:[]);
  }
  update(view){
    this.time.value=view.game.time;let changed=false;
    for(const {type,index} of this.resourceCells){
      const value=view.game.visible(view.localId,index%view.map.width,Math.floor(index/view.map.width))?Math.ceil(Math.min(1,Math.max(0,view.game.ore[index])/(type==='gem'?8000:5000))*255):0;
      if(this.mask.image.data[index*4+3]!==value){this.mask.image.data[index*4+3]=value;changed=true;}
    }
    if(changed)this.mask.needsUpdate=true;
  }
  prepare(source,id){
    if(!['grass','dirt-road','curved-road','ocean'].includes(id))return source;
    const material=source.clone(),water=id==='ocean',road=id.includes('road');
    if(water){material.normalMap=null;material.roughness=.62;}
    this.materials.push(material);
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{terrainMask:{value:this.mask},terrainSize:{value:this.size},terrainTime:this.time});
      shader.vertexShader='varying vec3 terrainWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 surfacePosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          surfacePosition=instanceMatrix*surfacePosition;
        #endif
        terrainWorld=(modelMatrix*surfacePosition).xyz;`);
      shader.fragmentShader=`varying vec3 terrainWorld;
uniform sampler2D terrainMask;uniform vec2 terrainSize;uniform float terrainTime;
${noise}
vec3 cellInfo(vec2 c){if(any(lessThan(c,vec2(0)))||any(greaterThanEqual(c,terrainSize)))return vec3(0);return texture2D(terrainMask,(c+.5)/terrainSize).rgb;}
float otherDistance(vec2 p,float water){vec2 c=floor(p+.5);float d=2.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 n=c+vec2(float(x),float(y));vec3 info=cellInfo(n);if(info.g>.5&&abs(info.r-water)>.5){vec2 q=max(abs(p-n)-.5,0.);d=min(d,length(q));}}return d;}
`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 wp=terrainWorld.xz;
float broad=noise21(wp*.31),grain=noise21(wp*53.);
float detail=noise21(wp*7.);
float shore=otherDistance(wp,${water?'1.':'0.'});
float edgeNoise=(noise21(wp*9.)-.5)*.055;
${water?`
float shallow=1.-smoothstep(.04,.95,shore);
vec3 sea=mix(vec3(.023,.105,.145),vec3(.075,.245,.225),shallow);
float wave=sin(wp.x*7.+wp.y*3.+noise21(wp*.9)*6.-terrainTime*1.2);
float ripple=pow(.5+.5*wave,8.)*(.003+.006*shallow);
sea+=ripple+(.5-detail)*.012;
float foam=(1.-smoothstep(.018,.10,abs(shore-.07-.028*sin(wp.x*2.+wp.y*2.-terrainTime))))*(.45+.55*noise21(wp*15.));
sea=mix(sea,vec3(.43,.55,.49),foam*.55);
diffuseColor.rgb=sea*vColor.rgb;
`:`
float soil=0.;vec2 resourceCell=floor(wp+.5);
for(int ry=-1;ry<=1;ry++)for(int rx=-1;rx<=1;rx++){
 vec2 rc=resourceCell+vec2(float(rx),float(ry));
 if(all(greaterThanEqual(rc,vec2(0)))&&all(lessThan(rc,terrainSize))){
 float quantity=texture2D(terrainMask,(rc+.5)/terrainSize).a;
 soil=max(soil,quantity*(1.-smoothstep(.25,.64,length(wp-rc)+(detail-.5)*.18)));
 }
}
// Shared world coordinates keep the grass portion of road tiles continuous with their neighbors.
diffuseColor.rgb*=mix(.68,1.02,broad)*mix(.91,1.07,detail);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.14,.115,.055)*vColor.rgb*(.8+.4*grain),soil*.7);
float beach=1.-smoothstep(.06,.48+edgeNoise,shore);
vec3 sand=mix(vec3(.14,.125,.083),vec3(.34,.29,.17),smoothstep(0.,.3,shore));
sand*=.85+.3*grain;
diffuseColor.rgb=mix(diffuseColor.rgb,sand*vColor.rgb,beach);
${road?`
// The authored texture supplies the curve and wheel ruts; only dirt receives gravel detail.
vec2 roadCell=floor(wp+.5),local=wp-roadCell;
float west=step(.5,cellInfo(roadCell-vec2(1,0)).b),east=step(.5,cellInfo(roadCell+vec2(1,0)).b);
float north=step(.5,cellInfo(roadCell-vec2(0,1)).b),south=step(.5,cellInfo(roadCell+vec2(0,1)).b);
if(west+east+north+south==1.){
 float tip=dot(local,vec2(west-east,north-south));
 if(grain<smoothstep(.15,.5,tip))discard;
}
float dirt=smoothstep(1.02,1.22,diffuseColor.r/max(diffuseColor.g,.001));
float gravel=smoothstep(.7,.86,grain)*dirt;
diffuseColor.rgb*=1.-dirt*(.12+.18*noise21(wp*2.7));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.24,.215,.16)*vColor.rgb,gravel*.23);
`:''}
`}`);
      if(water)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
// Surface gradients transform with the camera; warped waves avoid a regular specular grid.
float waterHeight=.008*sin(wp.x*7.+wp.y*3.+noise21(wp*.9)*6.-terrainTime*1.2)+.004*noise21(wp*5.+terrainTime*.2);
vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
vec3 crossX=cross(dpdy,normal),crossY=cross(normal,dpdx);
float determinant=dot(dpdx,crossX);
normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(waterHeight)*crossX+dFdy(waterHeight)*crossY));`);
    };
    material.customProgramCacheKey=()=>`terrain-${id}-v1`;
    return material;
  }
  dispose(){for(const m of this.materials)m.dispose();this.mask.dispose();}
}
