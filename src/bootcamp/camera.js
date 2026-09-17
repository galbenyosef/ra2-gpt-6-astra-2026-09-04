// Camera-only state. Engine coordinates and unit headings never change with the viewing angle.
import * as T from 'three';
export const pixelScale=30*Math.SQRT2, heightStep=1/Math.sqrt(6);
export class BattleCamera {
  yaw=Math.PI/4;pitch=Math.PI/6;preset='isometric';
  orthographic=new T.OrthographicCamera();perspective=new T.PerspectiveCamera(40,1,.1,2000);
  camera=this.orthographic;
  sync(view){
    const key=[view.camera.x,view.camera.y,view.width,view.height,view.zoom,this.yaw,this.pitch,this.preset].join(':');
    if(key===this.key)return this.camera;this.key=key;
    const target=view.unproject(view.camera.x,view.camera.y),scale=pixelScale*view.zoom;
    const camera=this.camera=this.preset==='perspective'?this.perspective:this.orthographic;
    camera.near=.1;camera.far=2000;
    const distance=camera.isPerspectiveCamera?view.height/(2*scale*Math.tan(T.MathUtils.degToRad(camera.fov/2))):500;
    if(camera.isPerspectiveCamera)camera.aspect=view.width/view.height;
    else{camera.left=-view.width/(2*scale);camera.right=-camera.left;camera.top=view.height/(2*scale);camera.bottom=-camera.top;}
    camera.position.set(target.x+Math.sin(this.yaw)*Math.cos(this.pitch)*distance,Math.sin(this.pitch)*distance,target.y+Math.cos(this.yaw)*Math.cos(this.pitch)*distance);
    camera.lookAt(target.x,0,target.y);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return camera;
  }
  setPreset(preset){this.preset=preset;this.pitch=preset==='top'?Math.PI*.47:preset==='perspective'?Math.PI/4:Math.PI/6;}
  rotate(delta){this.yaw=(this.yaw+delta)%(Math.PI*2);}
  orbit(yaw,pitch){this.yaw=yaw;this.pitch=Math.max(.25,Math.min(Math.PI*.47,pitch));}
  reset(){this.yaw=Math.PI/4;this.setPreset('isometric');}
  ray(x,y,view){
    const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x/view.width*2-1,1-y/view.height*2),this.sync(view));return ray;
  }
  ground(x,y,view,height=0){
    return this.ray(x,y,view).ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-height),new T.Vector3());
  }
  project(x,y,view,elevated=true,height=0){
    const v=new T.Vector3(x,(elevated?view.elevation(x,y)*heightStep:0)+height,y).project(this.sync(view));
    return {x:(v.x+1)*view.width/2,y:(1-v.y)*view.height/2};
  }
  pan(dx,dy,view,base=view.camera){
    const a=this.ground(view.width/2,view.height/2,view),b=this.ground(view.width/2+dx,view.height/2+dy,view);
    if(!a||!b)return;
    const offset=view.project(b.x-a.x,b.z-a.z);view.camera.x=base.x+offset.x;view.camera.y=base.y+offset.y;
  }
}
