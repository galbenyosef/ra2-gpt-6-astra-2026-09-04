// Authored locomotion timing. SHP inspection keeps its six source slots separately.
export const motionCycles = {
 walk: {duration:.72, frames:20, distance:2.4},
 panic: {duration:.72, frames:20, distance:2.4},
 swim: {duration:1.35, frames:32},
 tread: {duration:1.35, frames:24},
 swimstop: {duration:.55, frames:12, once:true},
 swimstart: {duration:.55, frames:12, once:true},
};
export const smoothstep=t=>t*t*(3-2*t);
// Constant-speed planted foot; C1 continuous swing returns it for the next strike.
export function runningFoot(phase){
 const p=((phase%1)+1)%1,stance=.22,travel=.528;
 if(p<stance)return {z:travel/2-travel*p/stance,lift:0,pitch:0};
 const u=(p-stance)/(1-stance),u2=u*u,u3=u2*u,slope=-2.4*(1-stance);
 return {z:(2*u3-3*u2+1)*(-travel/2)+(u3-2*u2+u)*slope+(-2*u3+3*u2)*(travel/2)+(u3-u2)*slope,lift:.23*Math.sin(Math.PI*u)**2,pitch:.55*Math.sin(2*Math.PI*u)};
}
