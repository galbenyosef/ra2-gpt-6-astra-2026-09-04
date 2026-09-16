// Original art.ini TanyaSequence layout; tuples are start, frames, facing stride.
export const sequences={ready:[0,1,1],guard:[0,1,1],walk:[8,6,6],idle1:[56,15,0],idle2:[71,15,0],crawl:[86,6,6],prone:[86,1,6],die1:[134,15,0],die2:[149,15,0],fireup:[164,6,6],fireprone:[212,6,6],down:[260,2,2],up:[276,2,2],wetidle1:[292,15,0],wetidle2:[307,15,0],wetdie1:[322,20,0],wetdie2:[342,20,0],tread:[410,6,6],swim:[506,6,6],wetattack:[554,6,6],paradrop:[602,1,0],cheer:[603,8,0],panic:[8,6,6],die3:[0,1,1],die4:[0,1,1],die5:[0,1,1]};
export const labels={ready:'待命',guard:'警戒',walk:'跑步',idle1:'待机 1',idle2:'待机 2',crawl:'匍匐',prone:'伏地',die1:'倒地 1',die2:'倒地 2',fireup:'站姿射击',fireprone:'卧姿射击',down:'卧倒',up:'起身',wetidle1:'水中待机 1',wetidle2:'水中待机 2',wetdie1:'水中死亡 1',wetdie2:'水中死亡 2',tread:'踩水',swim:'游泳',wetattack:'水中射击',paradrop:'伞降',cheer:'欢呼',panic:'惊慌跑步',die3:'死亡占位 3',die4:'死亡占位 4',die5:'死亡占位 5'};
export const fps=12;
export const isOnce=name=>['down','up','die1','die2','wetdie1','wetdie2','paradrop'].includes(name);
export function sourceFrame(name,direction,step){const [start,count,stride]=sequences[name];return start+direction*stride+Math.min(count-1,Math.max(0,step));}
export function sourceFacing(name){return {idle1:2,idle2:6,wetidle1:4,wetidle2:6,cheer:6,die1:2,die2:6,wetdie1:4,wetdie2:4}[name]??0;}

// A held one-shot endpoint must remain reachable in the source-frame inspector.
export function sourcePhase(name,step){const count=sequences[name][1];if(name==='down'||name==='up')return (step+1)/3;return step/(isOnce(name)&&count>1?count-1:count);}
