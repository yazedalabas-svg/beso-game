export const TILE = 3.2;
export const SYMBOLS = ['coffee', 'clock', 'door'];
export function seeded(seed) { let a=seed>>>0; return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export function neighbors(grid,p){return [[1,0],[-1,0],[0,1],[0,-1]].map(([x,z])=>[p[0]+x,p[1]+z]).filter(([x,z])=>grid[z]?.[x]===0);}
export function pathfind(grid,start,end){
 const k=p=>p.join(','), q=[start], came=new Map([[k(start),null]]);let i=0;
 while(i<q.length){const p=q[i++];if(k(p)===k(end))break;for(const n of neighbors(grid,p))if(!came.has(k(n))){came.set(k(n),p);q.push(n);}}
 if(!came.has(k(end)))return [];const path=[];let cur=end;while(cur){path.push(cur);cur=came.get(k(cur));}return path.reverse();
}
function distanceMap(grid,start){const key=p=>p.join(','),q=[start],distance=new Map([[key(start),0]]),came=new Map([[key(start),null]]);for(let i=0;i<q.length;i++){const p=q[i];for(const n of neighbors(grid,p)){const k=key(n);if(distance.has(k))continue;distance.set(k,distance.get(key(p))+1);came.set(k,p);q.push(n);}}return {distance,came};}
function routeFrom(came,end){const route=[];let p=end;while(p){route.push(p);p=came.get(p.join(','));}return route.reverse();}
export function createMaze(seed=42,size=25){
 if(size<9||size%2===0)throw new Error('Maze size must be odd and >=9');
 const random=seeded(seed),grid=Array.from({length:size},()=>Array(size).fill(1)),start=[1,1],stack=[start];grid[1][1]=0;
 while(stack.length){const p=stack.at(-1);const options=[[2,0],[-2,0],[0,2],[0,-2]].map(([x,z])=>[p[0]+x,p[1]+z]).filter(([x,z])=>x>0&&z>0&&x<size-1&&z<size-1&&grid[z][x]===1);
  if(!options.length){stack.pop();continue;}const n=options[Math.floor(random()*options.length)];grid[(n[1]+p[1])/2][(n[0]+p[0])/2]=0;grid[n[1]][n[0]]=0;stack.push(n);
 }
 let initial=[];for(let z=0;z<size;z++)for(let x=0;x<size;x++)if(!grid[z][x])initial.push([x,z]);
 const firstSearch=distanceMap(grid,start);let firstExit=start,firstMax=0;for(const p of initial){const d=firstSearch.distance.get(p.join(','))||0;if(d>firstMax){firstMax=d;firstExit=p;}}const firstPath=routeFrom(firstSearch.came,firstExit);
 // Open several actual rooms and a handful of loops. The result keeps the maze readable
 // while avoiding the old one-corridor-at-a-time feel.
 const rooms=[];for(const ratio of [.24,.50,.73]){const anchor=firstPath[Math.floor(firstPath.length*ratio)]||start;const cx=Math.max(2,Math.min(size-3,anchor[0])),cz=Math.max(2,Math.min(size-3,anchor[1]));for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++)grid[z][x]=0;rooms.push([cx,cz]);}
 const candidates=[];for(let z=1;z<size-1;z++)for(let x=1;x<size-1;x++)if(grid[z][x]===1&&((grid[z][x-1]===0&&grid[z][x+1]===0)||(grid[z-1][x]===0&&grid[z+1][x]===0)))candidates.push([x,z]);
 for(let i=0;i<Math.min(18,candidates.length);i++){const at=Math.floor(random()*candidates.length),p=candidates.splice(at,1)[0];grid[p[1]][p[0]]=0;}
 const cells=[];for(let z=0;z<size;z++)for(let x=0;x<size;x++)if(!grid[z][x])cells.push([x,z]);
 const fromStart=distanceMap(grid,start);let exit=start,maxDistance=0;for(const p of cells){const d=fromStart.distance.get(p.join(','))||0;if(d>maxDistance){maxDistance=d;exit=p;}}const longest=routeFrom(fromStart.came,exit);
 const checkpoint=longest[Math.floor(longest.length*.48)];
 const branch=cells.filter(p=>p.join()!=exit.join()&&p.join()!=checkpoint.join()&&(fromStart.distance.get(p.join(','))||0)>15),fromCheckpoint=distanceMap(grid,checkpoint);
 const evidence=branch.sort((a,b)=>Math.abs((fromCheckpoint.distance.get(a.join(','))||99)-9)-Math.abs((fromCheckpoint.distance.get(b.join(','))||99)-9))[0]||longest[Math.floor(longest.length*.7)];
 const batteries=[];for(let i=13;i<longest.length-5;i+=24)batteries.push(longest[i]);
 const mushrooms=[];for(let i=9;i<longest.length-5;i+=17)mushrooms.push(longest[i]);
 const powerPoints=rooms.map((p,i)=>{const dm=distanceMap(grid,p).distance;return cells.find(c=>{const d=dm.get(c.join(','))||0;return d>7+i*2&&d<18+i*3;})||p;});
 const scareCells=rooms.map((p,i)=>{const dm=distanceMap(grid,p).distance;return cells.find(c=>(dm.get(c.join(','))||0)===4+i)||p;});
 const lounge=rooms[1]||checkpoint,control=rooms[2]||evidence;
 return {grid,start,exit,checkpoint,evidence,cells,path:longest,batteries,mushrooms,powerPoints,scareCells,rooms,lounge,control,seed,size};
}
export function cellToWorld(p){return {x:p[0]*TILE,z:p[1]*TILE};}
export function worldToCell(p){return [Math.floor((p.x+TILE/2)/TILE),Math.floor((p.z+TILE/2)/TILE)];}
export function mazeSolid(grid,x,z,r=.23){for(const dx of [-r,r])for(const dz of [-r,r]){const [cx,cz]=worldToCell({x:x+dx,z:z+dz});if(grid[cz]?.[cx]!==0)return true;}return false;}
export function lineOfSight(grid,a,b){const d=Math.hypot(b.x-a.x,b.z-a.z);for(let i=.12;i<d;i+=.18){const t=i/d;if(mazeSolid(grid,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,0))return false;}return true;}
export function roomUnlocked(flags){return flags.keyFound&&flags.memorySolved;}
export function solveMemory(input){return input.length===3&&input.every((x,i)=>x===SYMBOLS[i]);}
export function endingFor(flags,choice){const both=flags.evidenceRoom&&flags.evidenceMaze;if(choice==='trust')return 'comedy';if(choice==='unknown')return 'loop';if(choice==='control')return both?'secret':null;if(choice==='leave')return both?'truth':'loop';return null;}
export function recoverRun(flags,checkpoint){return {...flags,battery:Math.max(18,checkpoint.battery),flashOn:false};}
export const ENDINGS={
 truth:{id:1,label:'المواجهة الأخيرة',title:'قربت... وكسرت الحصار.',text:'لحق مرزوق ببيسو خلف باب الخروج. تحولت المواجهة إلى اختبار قوة وإيقاف زمن، لكن بيسو اختار طريقه أخيرًا وترك مرزوق أمام الباب الذي صنعه.',quip:'«أنت ما لك حق تختار عني.»',tone:'green'},
 comedy:{id:2,label:'المصالحة المسمومة',title:'فنجال... بطعم الشك.',text:'جلس بيسو مع مرزوق وجرّب ماء اللوز. للحظة بدت المصالحة حقيقية، ثم عادت الغرفة والسرير والباب المقفل. ما زال السؤال: هل خرج أصلًا؟',quip:'«هذه المرة ما فيه منوّم... غالبًا.»',tone:'gold'},
 loop:{id:3,label:'أنت شخص رهيب',title:'الطريق الذي مشياه معًا.',text:'وجد بيسو مرزوق محطمًا عند المخرج. اعترف مرزوق بفشله وبالخوف الذي حوّل الحماية إلى سجن. بيسو لم يمحُ الخطأ، لكنه مد يده كي يواجها الباب معًا.',quip:'«أنت شخص رهيب يا مرزوق.»',tone:'blue'},
 secret:{id:4,label:'سر الحماية',title:'الشيء خلف الباب.',text:'أظهرت غرفة المراقبة أن مرزوق كان يخفي بيسو من كيان يتغذى على الخوف. خرجا معًا بلا أقفال ولا كذب، لكن الطرق من الجهة الأخرى بدأ قبل أن يفتحا الباب.',quip:'«كان يكفي تقول لي الحقيقة.»',tone:'violet'}
};
