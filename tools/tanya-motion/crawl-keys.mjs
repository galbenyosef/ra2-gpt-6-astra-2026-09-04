// Manual landmarks from Crawl's six source slots, checked in N/W/S views.
// +Z is forward. These inferred depths retain unequal legs at every source key.
export const crawlKeys = [
 {leftFoot:[.14,.08,-.81],rightFoot:[-.34,.08,-.48],leftHand:[.23,.10,.73],rightHand:[-.28,.10,.50],roll:-.045},
 {leftFoot:[.20,.08,-.72],rightFoot:[-.30,.08,-.61],leftHand:[.27,.10,.60],rightHand:[-.26,.12,.58],roll:-.020},
 {leftFoot:[.33,.08,-.50],rightFoot:[-.14,.08,-.80],leftHand:[.30,.10,.50],rightHand:[-.22,.12,.74],roll:.035},
 {leftFoot:[.34,.08,-.47],rightFoot:[-.14,.08,-.81],leftHand:[.29,.10,.52],rightHand:[-.20,.10,.78],roll:.045},
 {leftFoot:[.27,.08,-.64],rightFoot:[-.22,.08,-.73],leftHand:[.24,.13,.65],rightHand:[-.27,.10,.62],roll:.010},
 {leftFoot:[.14,.08,-.81],rightFoot:[-.35,.08,-.49],leftHand:[.21,.12,.79],rightHand:[-.30,.10,.51],roll:-.040},
];
export const crawlLabels=['右腿屈起 · 左臂前探','支撑前移','左腿收起 · 右臂前探','左腿屈起 · 右臂支撑','换侧移重','右腿收起 · 左臂前探'];
export function crawlKey(phase){const p=((phase%1)+1)%1*6,i=Math.floor(p),t=p-i,a=crawlKeys[i],b=crawlKeys[(i+1)%6],u=t*t*(3-2*t);return Object.fromEntries(Object.keys(a).map(k=>[k,Array.isArray(a[k])?a[k].map((v,j)=>v+(b[k][j]-v)*u):a[k]+(b[k]-a[k])*u]));}
