export const TILE = 3.2;
export const SYMBOLS = ['coffee', 'clock', 'door'];
export function seeded(seed) { let a=seed>>>0; return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export function neighbors(grid,p){return [[1,0],[-1,0],[0,1],[0,-1]].map(([x,z])=>[p[0]+x,p[1]+z]).filter(([x,z])=>grid[z]?.[x]===0);}
export function pathfind(grid,start,end){
 const k=p=>p.join(','), q=[start], came=new Map([[k(start),null]]);let i=0;
 while(i<q.length){const p=q[i++];if(k(p)===k(end))break;for(const n of neighbors(grid,p))if(!came.has(k(n))){came.set(k(n),p);q.push(n);}}
 if(!came.has(k(end)))return [];const path=[];let cur=end;while(cur){path.push(cur);cur=came.get(k(cur));}return path.reverse();
}
export function createMaze(seed=42,size=17){
 if(size<9||size%2===0)throw new Error('Maze size must be odd and >=9');
 const random=seeded(seed),grid=Array.from({length:size},()=>Array(size).fill(1)),start=[1,1],stack=[start];grid[1][1]=0;
 while(stack.length){const p=stack.at(-1);const options=[[2,0],[-2,0],[0,2],[0,-2]].map(([x,z])=>[p[0]+x,p[1]+z]).filter(([x,z])=>x>0&&z>0&&x<size-1&&z<size-1&&grid[z][x]===1);
  if(!options.length){stack.pop();continue;}const n=options[Math.floor(random()*options.length)];grid[(n[1]+p[1])/2][(n[0]+p[0])/2]=0;grid[n[1]][n[0]]=0;stack.push(n);
 }
 const cells=[];for(let z=0;z<size;z++)for(let x=0;x<size;x++)if(!grid[z][x])cells.push([x,z]);
 let exit=start,longest=[];for(const p of cells){const path=pathfind(grid,start,p);if(path.length>longest.length){exit=p;longest=path;}}
 const checkpoint=longest[Math.floor(longest.length*.48)];
 const branch=cells.filter(p=>p.join()!=exit.join()&&p.join()!=checkpoint.join()&&pathfind(grid,start,p).length>15);
 const evidence=branch.sort((a,b)=>Math.abs(pathfind(grid,checkpoint,a).length-9)-Math.abs(pathfind(grid,checkpoint,b).length-9))[0]||longest[Math.floor(longest.length*.7)];
 const batteries=[];for(let i=7;i<longest.length-4;i+=10)batteries.push(longest[i]);
 return {grid,start,exit,checkpoint,evidence,cells,path:longest,batteries,seed,size};
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
 truth:{id:1,label:'الهروب الحقيقي',title:'هالمرة... طلعت.',text:'خرجت بالتسجيل والرسالة. مرزوق تركك للممرات عشان ينجو بنفسه. الباب تسكّر خلفك، ولأول مرة صار الطنين بعيد.',quip:'«أول بلاغ بحياتي سببه خوي.»',tone:'green'},
 comedy:{id:2,label:'النهاية الكوميدية',title:'مفاجــأة يا بيسو!',text:'فتحت لمرزوق. اشتغلت أغنية عيد ميلاد وطلع بكعكة مكتوب عليها: آسفين على المنوّم. المكان كله غرفة هروب استأجرها بالساعة... والحين يبيك تدفع النص.',quip:'«تحتفل بميلادي ولا تسوي لي جنازة تدريبية؟»',tone:'gold'},
 loop:{id:3,label:'الرعب المفتوح',title:'مو كل باب... مخرج.',text:'دخلت الباب المجهول على أمل أن يكون المخرج. وصلت بيتك، فتحت غرفتك... نفس السرير، نفس الكوب، ونفس المفتاح تحته. وفي جيبك ورقة: المحاولة ١٧.',quip:'«مرزوق... أنت للحين تحميني؟»',tone:'red'},
 secret:{id:4,label:'النهاية السرية',title:'أهلًا برجعتك، بيسو.',text:'واجهته بالدليل وطلبت دخول غرفة التحكم. داخل غرفة التحكم، عشرات التسجيلات تحمل توقيعك. مرزوق يهمس: أنت اللي طلبت مني أمسح ذاكرتك كل مرة. على الشاشة أمر واحد: ابدأ تجربة الصداقة من جديد.',quip:'«يعني حتى أنا... ما أقدر أثق فيني؟»',tone:'violet'}
};
