/** Lifecycle contract for the lazy WebGL presenter; state always belongs to GameEngine. */
import type {BattlefieldRenderer} from '../renderer';
import type {Entity} from '../game';
export class ModelLayer {
 static load(onFailure:()=>void, signal:AbortSignal):Promise<ModelLayer>;
 draw(view:BattlefieldRenderer):void;
 pick(x:number,y:number,view:BattlefieldRenderer):Entity|undefined;
 dispose():void;
}
