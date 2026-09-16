// The source-key tables stay together so action phases and observation labels can be reviewed as one data set.
// Authored landmarks from TanyaSequence contact sheets. Metres, +Z forward.
// Source silhouettes constrain these keys; concealed depth and fingers remain inferred.
export function keyAt(keys,phase,once=false){
 const p=Math.max(0,Math.min(1,phase))*(once?keys.length-1:keys.length),i=Math.min(keys.length-1,Math.floor(p)),a=keys[i],b=keys[once?Math.min(i+1,keys.length-1):(i+1)%keys.length],t=p-i,u=t*t*(3-2*t);
 return a.map((v,j)=>v+(b[j]-v)*u);
}
// Hand half-width, height, forward reach: wide pull -> recovery -> reach -> catch.
export const swimHandKeys=[[.50,.12,.56],[.29,.10,.49],[.16,.12,.77],[.16,.15,.99],[.32,.13,.94],[.53,.12,.72]];
// Alternating, narrow kicks, not the earlier invented simultaneous frog kick.
// Left/right ankle heights and backward reach at each of the six source samples.
export const swimFootKeys=[[.10,-.08,-.81,-.76],[.04,-.04,-.83,-.79],[-.07,.09,-.76,-.82],[-.08,.10,-.76,-.81],[-.02,.03,-.80,-.83],[.09,-.07,-.82,-.76]];
// Sculling hands keep changing while the legs tread below the waterline.
export const treadKeys=[[.34,1.10,.21,.02],[.48,1.12,.15,.06],[.44,1.10,.10,.02],[.29,1.08,.16,-.03],[.31,1.10,.24,-.06],[.38,1.11,.27,-.02]];
export const recoilKeys=[[0,.035],[.055,0],[0,.045],[.045,0],[0,.025],[.035,0]];
// Idle1: lower guns, sweep one up, turn away, return and sweep the other side.
// Body yaw; right hand x/y/z; left hand x/y/z; right wrist pitch.
export const idle1Keys=[
 [0,-.28,.84,.02,.28,.84,.02,0],[.15,-.20,1.14,.33,.22,1.02,.20,-1.0],
 [.55,-.20,1.38,.48,.24,.90,.06,-1.55],[.85,-.23,1.39,.13,.27,.86,.06,-2.8],
 [.95,-.22,1.40,.10,.28,.86,.04,-2.9],[.92,-.22,1.39,.12,.28,.86,.04,-2.8],
 [.86,-.21,1.38,.13,.27,.87,.03,-2.7],[.65,-.21,1.35,.14,.28,.88,.04,-2.6],
 [.35,-.23,1.24,.16,.29,.90,.08,-2.1],[0,-.38,1.10,.20,.26,.87,.08,-1.3],
 [-.35,-.28,.95,.08,.36,1.02,.22,-.7],[-.45,-.27,.88,.04,.40,1.00,.20,-.2],
 [-.35,-.27,.86,.03,.38,.98,.19,0],[-.15,-.28,.85,.02,.32,.91,.10,0],
 [0,-.28,.84,.02,.28,.84,.02,0],
];
// Original Idle1 rotates between its front and side silhouettes.
[1.57,1.0,.2,-.65,-.70,-.70,-.65,-.50,-.20,.60,1.10,1.40,1.50,1.57,1.57].forEach((yaw,i)=>idle1Keys[i][0]=yaw);
// Idle2: right pistol is tossed from frame 3 and caught by frame 11.
export const idle2Keys=[
 [.84,.02,0],[1.06,.25,-.8],[1.34,.24,-2.4],[1.40,.19,-3.0],[1.40,.20,-3.0],
 [1.39,.20,-3.0],[1.38,.20,-3.0],[1.38,.20,-3.0],[1.39,.20,-3.0],
 [1.40,.20,-3.0],[1.41,.20,-3.0],[1.36,.20,-2.7],[1.16,.24,-1.6],[.92,.10,-.5],[.84,.02,0],
];
for(let i=2;i<=11;i++)idle2Keys[i][1]=.40;
export const cheerKeys=[[1.49,-2.7],[1.78,-3.1],[1.63,-2.9],[1.45,-2.6],[1.57,-2.85],[1.74,-3.05],[1.70,-3.0],[1.65,-2.95]];
// Wet idle 1 ducks under; wet idle 2 pitches forward and recovers. Hips y, pitch,
// hand height relative to hips, hand spread, forward reach (in upright body space).
export const wetIdle1Keys=[
 [.92,.05,.18,.35,.22],[.97,.05,.30,.42,.20],[.69,.18,.13,.42,.22],
 [.45,.26,-.12,.32,.18],[.40,.22,-.15,.29,.15],[.39,.18,-.18,.25,.16],
 [.39,.16,-.19,.24,.17],[.39,.16,-.19,.24,.17],[.40,.14,-.18,.25,.18],
 [.42,.12,-.16,.27,.18],[.48,.08,-.10,.28,.20],[.59,.03,.10,.30,.20],
 [.72,.02,.20,.33,.21],[.85,.04,.22,.35,.22],[.92,.05,.18,.35,.22],
];
export const wetIdle2Keys=[
 [.92,.06,.18,.35,.22],[.77,.50,.12,.41,.28],[.64,.92,.06,.42,.30],
 [.54,1.28,.08,.38,.34],[.49,1.60,.10,.35,.34],[.45,1.90,.14,.30,.30],
 [.44,2.32,.22,.27,.23],[.46,2.50,.28,.25,.15],[.49,2.35,.26,.28,.16],
 [.52,1.95,.20,.34,.19],[.56,1.45,.17,.40,.26],[.62,1.00,.16,.40,.28],
 [.71,.55,.19,.38,.25],[.84,.20,.20,.36,.23],[.92,.06,.18,.35,.22],
];
// Non-looping deaths preserve each source slot, including the initial flinch,
// the second land variant's tumble, and the final held/faded state.
// Hips height, pitch, roll, arm spread, hand height relative to hips, hand z.
export const death1Keys=[
 [.92,0,0,.35,.30,.10],[.90,-.16,.10,.42,.52,.12],[.85,-.20,.14,.46,.37,.09],
 [.83,.12,.07,.42,.20,.16],[.85,.25,0,.33,.05,.18],[.91,.08,0,.27,-.06,.08],
 [.92,0,0,.27,-.09,.02],[.92,0,0,.27,-.09,.02],[.91,.04,.02,.28,-.06,.05],
 [.90,.03,.04,.29,-.05,.05],[.68,-.52,.18,.43,.35,.06],[.30,-1.35,.20,.37,.30,.08],
 [.19,-1.56,.16,.35,.23,.04],[.18,-1.57,.15,.35,.23,.04],[.18,-1.57,.15,.35,.23,.04],
];
death1Keys.forEach((key,i)=>{if(i>=10)key[1]=Math.abs(key[1]);key.push(i<9?Math.PI/2:i===9?1.2:i===10?.8:i===11?.2:0);});
export const death2Keys=[
 [.92,0,0,.30,.08,.02],[1.00,-.50,.10,.39,.55,.14],[1.08,-1.10,.22,.44,.45,.20],
 [.99,-2.10,.22,.40,.34,.20],[.98,-3.15,.13,.33,.22,.16],[.83,-4.42,.06,.35,.27,.20],
 [.83,-5.78,0,.42,.47,.22],[.70,-6.30,.03,.44,.51,.15],[.39,-6.60,.10,.38,.32,.22],
 [.27,-6.73,.10,.31,.12,.26],[.24,-6.74,.10,.29,.08,.25],[.24,-6.74,.10,.29,.08,.25],
 [.24,-6.74,.10,.29,.08,.25],[.19,-7.55,.12,.37,.30,.12],[.18,-7.84,.10,.38,.31,.12],
];
export const wetDeath1Keys=[
 [.92,0,0,.34,.18,.22],[.98,-.10,.10,.40,.55,.18],[.97,-.20,.13,.43,.62,.17],
 [.93,-.30,.12,.40,.61,.18],[.90,-.33,.10,.35,.64,.14],[.86,-.25,.08,.28,.70,.08],
 [.81,-.12,.04,.20,.73,.04],[.73,0,0,.19,.74,.04],[.63,.08,0,.20,.74,.05],
 [.51,.14,0,.21,.73,.06],[.39,.18,0,.21,.74,.05],[.27,.20,0,.20,.74,.05],
 [.12,.22,0,.19,.74,.05],[-.08,.23,0,.18,.74,.05],[-.28,.24,0,.18,.74,.05],
 [-.55,.24,0,.18,.74,.05],[-.85,.24,0,.18,.74,.05],[-1.20,.24,0,.18,.74,.05],
 [-1.65,.24,0,.18,.74,.05],[-2.10,.24,0,.18,.74,.05],
];
export const wetDeath2Keys=wetDeath1Keys.map((k,i)=>[k[0],k[1]-.12*Math.sin(i/19*Math.PI),-.12*Math.sin(i/19*Math.PI),k[3]+(i<7?.12:0),k[4]-(i<7?.22:0),k[5]+(i<7?.13:0)]);
export const actionNotes={
 ready:'双臂下垂待命',walk:'右手持枪抬起 · 左臂摆动 · 双脚交替',
 idle1:'转身摆枪',idle2:'右手抛接手枪',crawl:'六帧错腿与交替支撑',prone:'匍匐首帧',
 fireup:'双枪交替后坐',fireprone:'右臂瞄准 · 左臂撑地',down:'单膝下沉并撑地',up:'从撑地姿势起身',
 swim:'双臂回收前伸再外划 · 交替打腿',tread:'双臂拨水 · 水下交替蹬腿',wetattack:'右手射击 · 左手拨水',
 wetidle1:'下潜再浮起',wetidle2:'前倾下潜再恢复',die1:'受击后侧倒',die2:'翻转后坐倒',
 wetdie1:'举臂下沉',wetdie2:'挣扎后下沉',paradrop:'双手举起 · 枪收起',cheer:'右手举枪欢呼',
};
// Separate left/right visibility avoids forcing guns into every SHP pose.
export function weaponVisible(name,side){
 if(['crawl','prone','swim','tread','wetidle1','wetidle2','wetdie1','wetdie2','paradrop','swimstart','swimstop'].includes(name))return false;
 return !(['fireprone','wetattack'].includes(name)&&side==='Left');
}
