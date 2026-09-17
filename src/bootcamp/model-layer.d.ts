/** Lifecycle contract for the lazy WebGL presenter; state always belongs to GameEngine. */
import type {BattlefieldRenderer} from '../renderer';
import type {Entity,Point} from '../game';
export class ModelLayer {
 rig:{yaw:number;pitch:number;preset:string;setPreset(preset:string):void;rotate(delta:number):void;orbit(yaw:number,pitch:number):void;reset():void};
 static load(onFailure:()=>void, signal:AbortSignal):Promise<ModelLayer>;
 draw(view:BattlefieldRenderer,marker?:Point&{age:number;attack:boolean}):void;
 pick(x:number,y:number,view:BattlefieldRenderer):Entity|undefined;
 toScreen(x:number,y:number,view:BattlefieldRenderer,elevation?:boolean):Point;
 screenToTile(x:number,y:number,view:BattlefieldRenderer):Point;
 pan(dx:number,dy:number,view:BattlefieldRenderer,base?:Point):void;
 zoomAt(x:number,y:number,factor:number,view:BattlefieldRenderer):void;
 dispose():void;
}
