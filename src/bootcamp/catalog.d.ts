/** Verified model identity, cell-space scale, original sprite, and measured axes. */
export interface Actor {
 id:string; name:string; type?:string; sprite?:string; file:string;
 height?:number; width?:number; x:number; z:number; forwardAxis:number[]; kind:string;
 motionKind?:string; teamColor?:boolean; muzzleLocal?:number[]; waterline?:number;
 environment?:boolean; groundOffset?:number;
}
export const actors: Actor[];
export const bootcampActors: (Actor & {type:string; sprite:string})[];
export const bootcampTypes: Set<string>;
export const BOOTCAMP_CREDITS: number;
export const labels: Record<string,string>;
export const once: Set<string>;
export const waterActions: Set<string>;
