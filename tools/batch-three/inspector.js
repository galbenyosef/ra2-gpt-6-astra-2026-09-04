// Same orthographic scale and lights for all named views; no scene yaw applied.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyTeamColor} from '../environment/team-color.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setClearColor('#292929');document.body.append(renderer.domElement);
const scene=new T.Scene(),loader=new GLTFLoader();scene.add(new T.HemisphereLight(0xdeeeff,0x627140,2.4));
const sun=new T.DirectionalLight(0xfff0d8,3);sun.position.set(-4,9,5);scene.add(sun);
const camera=new T.OrthographicCamera(-3,3,3,-3,.01,100),axes={front:[-1,.15,0],rear:[1,.15,0],left:[0,.15,1],right:[0,.15,-1],top:[0,1,.0001],source:[1,Math.sqrt(2/3),-1]};
let center=new T.Vector3(),radius=3,root,team;
function view(name){camera.position.copy(center).add(new T.Vector3(...axes[name]).normalize().multiplyScalar(radius*3));camera.lookAt(center);camera.updateMatrixWorld();renderer.render(scene,camera);}
function fit(object){const box=new T.Box3().setFromObject(object);center=box.getCenter(new T.Vector3());radius=box.getSize(new T.Vector3()).length()*.62;const aspect=innerWidth/innerHeight;camera.left=-radius*aspect;camera.right=radius*aspect;camera.top=radius;camera.bottom=-radius;camera.updateProjectionMatrix();view('source');return{min:box.min.toArray(),max:box.max.toArray(),radius};}
async function load(url){if(root)root.removeFromParent();const gltf=await loader.loadAsync(url);root=gltf.scene;scene.add(root);let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});team=await applyTeamColor(gltf).catch(()=>null);return{...fit(root),triangles,animations:gltf.animations.map(c=>c.name)};}
async function roadAssembly(){
 root=new T.Group();scene.add(root);const names={grass:'/environment/grass.glb',straight:'/hd/batch-two/dirt-road.glb',bend:'/hd/batch-three/curved-road.glb'},models={};
 for(const[id,url]of Object.entries(names))models[id]=(await loader.loadAsync(url)).scene;
 const add=(id,x,z,angle=0)=>{const n=models[id].clone(true);n.position.set(x,0,z);n.rotation.y=angle;root.add(n);};
 add('bend',0,0);
 for(let z=-3;z<=2;z++)for(let x=-2;x<=3;x++){
  const X=x+.5,Z=z+.5;if(Math.abs(X)<1&&Math.abs(Z)<1)continue;
  if(x===-1&&z<-1)add('straight',X,Z);else if(z===0&&x>=1)add('straight',X,Z,Math.PI/2);else add('grass',X,Z);
 }
 return fit(root);
}
window.assetReview={ready:true,T,renderer,scene,camera,load,view,roadAssembly,get root(){return root;},get team(){return team;}};
