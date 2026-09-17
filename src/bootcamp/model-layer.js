// Authored GLB world and actors, sharing the native game's state and input controller.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {bootcampActors} from './catalog.js';
import {prepareTeamMasks,cloneTeamMaterial} from './team-color.js';
import {appUrl} from '../urls';
import {unitIsMoving} from '../sprite-animation';
import {BattleCamera,heightStep} from './camera.js';
import {EnvironmentScene} from './environment-scene.js';
import {drawWorldOverlays} from './overlays.js';

export class ModelLayer {
  templates = new Map(); models = new Map(); disposed = false;
  scene = new T.Scene(); rig = new BattleCamera(); camera = this.rig.camera;
  constructor(onFailure) {
    this.webgl = new T.WebGLRenderer({alpha:true, antialias:true, preserveDrawingBuffer:true});
    this.webgl.setClearColor(0, 0);
    this.webgl.outputColorSpace = T.SRGBColorSpace;
    this.webgl.toneMapping = T.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.15;
    this.scene.background=new T.Color('#182820');
    this.scene.add(new T.HemisphereLight(0xdeeeff,0x627140,2.4));
    const sun = new T.DirectionalLight(0xfff0d8,3); sun.position.set(-10,35,20);this.scene.add(sun);
    this.onLost = event => {event.preventDefault(); if (!this.disposed) onFailure();};
    this.webgl.domElement.addEventListener('webglcontextlost', this.onLost);
  }
  static async load(onFailure, signal) {
    const layer = new ModelLayer(onFailure), loader = new GLTFLoader();
    try {
      // Sequential downloads bound peak GLB decode memory. Cancellation also covers leaving mid-load.
      for (const config of bootcampActors) {
        const response = await fetch(appUrl(__BOOTCAMP_MODEL_URLS__[config.type]), {signal});
        if (!response.ok) throw Error(`Model ${config.type}: HTTP ${response.status}`);
        const gltf = await loader.parseAsync(await response.arrayBuffer(), '');
        layer.templates.set(config.type, {config, gltf});
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (config.teamColor) layer.templates.get(config.type).masks=await prepareTeamMasks(gltf);
      }
      layer.environment=await EnvironmentScene.load(signal);layer.scene.add(layer.environment.root);
      return layer;
    } catch (error) {layer.dispose();throw error;}
  }
  create(entity) {
    const template = this.templates.get(entity.type);
    if (!template) throw Error('Unregistered model: ' + entity.type);
    const {config, gltf, masks} = template, root = clone(gltf.scene), body = new T.Group(), group = new T.Group();
    const bounds = new T.Box3().setFromObject(root), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
    const scale = config.height ? config.height/size.y : config.width/Math.max(size.x,size.z);
    body.scale.setScalar(scale);body.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    const color = {value:new T.Color()};
    root.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled=false;
      const next = [o.material].flat().map(source => cloneTeamMaterial(source,masks?.get(source),color));
      o.material=Array.isArray(o.material)?next:next[0];
    });
    body.add(root);group.add(body);group.userData.entityId=entity.id;this.scene.add(group);
    const model={entity,config,root,body,group,color,mixer:new T.AnimationMixer(root),clips:gltf.animations,playing:'',action:null,scale,height:size.y*scale};
    this.models.set(entity.id,model);return model;
  }
  draw(view,marker) {
    if (this.disposed) return;
    const {game,width,height} = view;
    const dpr=Math.min(devicePixelRatio||1,2);
    if(this.width!==width||this.height!==height||this.dpr!==dpr) {
      this.width=width;this.height=height;this.dpr=dpr;this.webgl.setPixelRatio(dpr);this.webgl.setSize(width,height,false);
    }
    this.camera=this.rig.sync(view);this.environment.update(view);
    const live=new Set(game.entities.filter(e=>e.hp>0).map(e=>e.id));
    for (const [id,m] of this.models) if (!live.has(id)) {this.release(m);this.models.delete(id);}
    for (const entity of game.entities) {
      if (entity.hp<=0) continue;
      const m=this.models.get(entity.id)||this.create(entity), c=m.config;
      m.group.visible=!entity.transportedBy && (entity.kind==='building'?game.explored(view.localId,entity.x,entity.y):game.visible(view.localId,entity.x,entity.y));
      m.color.value.set(game.getPlayer(entity.owner)?.color||'#aaaaaa');
      const flying=c.kind==='air'?1.3:0, water=c.kind==='naval'?(c.waterline??-.4):0;
      m.group.position.set(entity.x,view.elevation(entity.x,entity.y)*heightStep+flying+water,entity.y);
      m.group.rotation.y=Math.atan2(c.forwardAxis[2],c.forwardAxis[0])-entity.angle;
      const moving=unitIsMoving(entity,game.time)||(c.kind==='air'&&entity.order.kind!=='idle'&&game.time-(entity.lastMovedAt??-Infinity)<.12), shot=game.time-entity.lastShot;
      const attack=shot>=0 && shot<.45;
      let name=c.kind==='air'?(attack?'firefly':moving?'fly':'hover'):
        entity.type==='giant_squid'?(attack?'attack':moving?'swim':'ready'):
        c.kind==='infantry'?(attack?'fireup':moving?'walk':'ready'):
        entity.type==='barracks'?'work':attack?'attack':'ready';
      const clip=m.clips.find(a=>a.name===name);
      if(m.playing!==name) {m.mixer.stopAllAction();m.playing=name;m.action=clip?m.mixer.clipAction(clip).play():null;}
      if(m.action) {
        // Animation is derived from engine time, so paused toggles and re-entry cannot advance it.
        m.action.time=(attack?shot:Math.max(0,game.time-entity.spawnedAt))%clip.duration;m.mixer.update(0);
      }
    }
    this.webgl.render(this.scene,this.camera);
    // The whole world uses one projection; screen-space HUD stays on the existing canvas.
    view.ctx.save();view.ctx.setTransform(dpr,0,0,dpr,0,0);
    view.ctx.drawImage(this.webgl.domElement,0,0,width,height);
    this.drawIndicators(view);
    drawWorldOverlays(view,this,marker);
    view.ctx.restore();
  }
  drawIndicators(view) {
    const ctx=view.ctx;this.boxes=new Map();
    for(const [id,m] of this.models) {
      if(!m.group.visible)continue;
      const e=m.entity,p=view.toScreen(e.x,e.y), color=view.game.getPlayer(e.owner)?.color||'#aaaaaa';
      const box=new T.Box3().setFromObject(m.group), pts=[];
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]) {
        const v=new T.Vector3(x,y,z).project(this.camera);pts.push({x:(v.x+1)*view.width/2,y:(1-v.y)*view.height/2});
      }
      const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));
      const w=Math.max(...pts.map(p=>p.x))-x,h=Math.max(...pts.map(p=>p.y))-y;
      this.boxes.set(id,{x,y,w,h});
      // All models receive an owner marker; only Rhino has an authored paint mask.
      ctx.strokeStyle=color;ctx.lineWidth=view.selection.has(id)?2:1;
      ctx.beginPath();ctx.ellipse(p.x,p.y,Math.max(8,w*.38),Math.max(4,w*.15),0,0,Math.PI*2);ctx.stroke();
      if(view.selection.has(id)||view.hoverEntity?.id===id||e.hp<e.maxHp){
        ctx.fillStyle='#07110c';ctx.fillRect(x,y-7,w,4);ctx.fillStyle=e.hp/e.maxHp<.3?'#f25343':'#8bd878';ctx.fillRect(x,y-7,w*e.hp/e.maxHp,4);
      }
    }
  }
  pick(x,y,view) {
    const ray=this.rig.ray(x,y,view);
    const roots=[...this.models.values()].filter(m=>m.group.visible&&view.game.visible(view.localId,m.entity.x,m.entity.y)).map(m=>m.group);
    for(const hit of ray.intersectObjects(roots,true)) {
      let object=hit.object;
      while(object&&!object.userData.entityId)object=object.parent;
      if(object)return view.game.getEntity(object.userData.entityId);
    }
  }
  toScreen(x,y,view,elevation=true){return this.rig.project(x,y,view,elevation);}
  screenToTile(x,y,view){
    const hits=this.rig.ray(x,y,view).intersectObjects(this.environment.groundMeshes,false);
    const point=hits[0]?.point||this.rig.ground(x,y,view);
    return point?{x:Math.round(point.x),y:Math.round(point.z)}:{x:-1,y:-1};
  }
  pan(dx,dy,view,base){this.rig.pan(dx,dy,view,base);}
  zoomAt(x,y,factor,view){
    const before=this.rig.ground(x,y,view);view.zoom=Math.max(.35,Math.min(2.5,view.zoom*factor));
    const after=this.rig.ground(x,y,view);if(before&&after){const delta=view.project(before.x-after.x,before.z-after.z);view.camera.x+=delta.x;view.camera.y+=delta.y;}
  }
  release(m) {
    this.scene.remove(m.group);m.mixer.stopAllAction();m.mixer.uncacheRoot(m.root);
    m.root.traverse(o=>{if(o.isMesh){for(const mat of [o.material].flat())mat.dispose();if(o.isSkinnedMesh)o.skeleton.dispose();}});
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;
    this.environment?.dispose();
    for(const m of this.models.values())this.release(m);this.models.clear();
    const textures=new Set(),geometries=new Set(),materials=new Set();
    for(const {gltf,masks} of this.templates.values()) {
      gltf.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [o.material].flat()){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}}});
      for(const mask of masks?.values()||[])textures.add(mask);
    }
    for(const t of textures){t.dispose();t.source?.data?.close?.();}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.templates.clear();
    this.webgl.domElement.removeEventListener('webglcontextlost',this.onLost);this.webgl.dispose();this.webgl.forceContextLoss();
  }
}
