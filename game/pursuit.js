import {pathfind,cellToWorld,worldToCell,lineOfSight,mazeSolid} from './logic.js';
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
const tiles=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
export function createPursuer(cell){const p=cellToWorld(cell);return {...p,cell:[...cell],state:'patrol',path:[],last:null,memory:0,energy:100,speed:0,yaw:0,step:0,phase:0,searches:0,cause:null,anchor:null,vx:0,vz:0,px:null,pz:null};}
// Where the player is heading, snapped to an open tile. Any prediction that lands in a wall or
// off the grid collapses back to their current tile, so a lead can never route through geometry.
function intercept(maze,e,player,lead){
 const x=player.x+e.vx*lead,z=player.z+e.vz*lead;
 if(mazeSolid(maze.grid,x,z,.3))return worldToCell(player);
 const cell=worldToCell({x,z});
 return maze.grid[cell[1]]?.[cell[0]]===0?cell:worldToCell(player);
}
export function advancePursuer(e,maze,player,dt,options){
 const {random,lit,sprinting,quiet,moving=sprinting,grace,safe,nearGoal=false}=options;
 const distance=Math.hypot(player.x-e.x,player.z-e.z),los=distance<24&&lineOfSight(maze.grid,e,player);
 const facing=(-Math.sin(e.yaw)*(player.x-e.x)-Math.cos(e.yaw)*(player.z-e.z))/Math.max(.001,distance);
 // Smoothed player velocity feeds the cut-off. Heavy smoothing means a teleport or a dropped
 // frame decays away over a second instead of flinging the predicted tile across the maze.
 if(e.px!==null){e.vx=e.vx*.86+((player.x-e.px)/Math.max(.001,dt))*.14;e.vz=e.vz*.86+((player.z-e.pz)/Math.max(.001,dt))*.14;}
 e.px=player.x;e.pz=player.z;
 const hidden=grace||safe;
 const sees=!hidden&&los&&distance<(lit?22:quiet?3.4:6.5)&&(lit||distance<2.6||facing>-.05);
 // Sound follows corridors, so it neither crosses walls at full volume nor requires sight.
 // Crouching stays silent; walking now carries, just far less than a sprint.
 const audible=quiet?0:sprinting?10:moving?5.5:0;
 const hearing=!hidden&&audible&&distance<audible?pathfind(maze.grid,e.cell,worldToCell(player)).length*3.2:Infinity;
 // Torchlight bounces off the corridor walls. He cannot place you from a glow, but he learns
 // which way to walk — which is what makes leaving the flashlight on genuinely expensive.
 const glow=!hidden&&lit&&!sees&&distance<13;
 if(sees){if(e.state!=='chase')e.cause=lit?'light':'dark';e.state='chase';e.last=worldToCell(player);e.anchor=e.last;e.memory=7;e.searches=0;}
 else if(hearing<11){e.last=worldToCell(player);e.anchor=e.last;if(e.state!=='chase')e.state='investigate';e.memory=4.5;}
 else if(glow&&e.state==='patrol'){e.last=worldToCell(player);e.anchor=e.last;e.state='investigate';e.memory=3;}
 else e.memory=Math.max(0,e.memory-dt);
 if(e.state==='chase'&&!sees&&e.memory===0)e.state='search';
 if(safe){e.state='patrol';e.last=null;e.anchor=null;e.cause=null;}
 // Only change routes at tile centres; never turn diagonally through a wall.
 if(!e.path.length){
  let target=e.last;
  if(e.state==='patrol'||!target||(same(e.cell,target)&&!sees)){
   if(e.state!=='patrol'&&++e.searches>4){e.state='patrol';e.last=null;e.anchor=null;e.cause=null;}
   // Hunting sweeps outward from the last place he actually had you, widening each failed
   // sweep. Patrolling takes the best of three draws toward you, so he drifts around your
   // side of the floor rather than wandering off to a corner for a minute.
   const hunting=e.state!=='patrol'&&e.anchor,ring=2+e.searches*2;
   const opts=maze.cells.filter(p=>{if(same(p,maze.checkpoint))return false;const d=tiles(p,e.cell);return hunting?d>1&&tiles(p,e.anchor)<=ring:d>2;});
   const pool=opts.length?opts:maze.cells;
   let pick=pool[Math.floor(random()*pool.length)];
   if(!hunting&&pick){const pc=worldToCell(player);for(let i=0;i<2;i++){const alt=pool[Math.floor(random()*pool.length)];if(alt&&tiles(alt,pc)<tiles(pick,pc))pick=alt;}}
   target=pick||maze.start;
  }
  else if(e.state==='chase'&&sees&&distance>3)target=intercept(maze,e,player,Math.min(1.4,distance/4.5));
  e.path=pathfind(maze.grid,e.cell,target).slice(1);
 }
 const running=e.state==='chase'&&sees&&distance>1.55&&e.energy>(nearGoal?8:18)&&!e.tired;
 // الجري على مسافة هو هرولة يقدر يثبت عليها؛ الانقضاض القريب هو اللي يستهلكه. بهالتفريق
 // يقدر يقصّر المسافة فعلًا خلال المطاردة الطويلة بدل ما يضيّع نفسه وهو بعيد عنك.
 e.energy=Math.max(0,Math.min(100,e.energy+(running?-(nearGoal?18:distance>6?15:25):12)*dt));
 if(e.energy<=18)e.tired=true;if(e.energy>58)e.tired=false;
 const direct=sees&&same(worldToCell(e),worldToCell(player));
 const desired=e.path.length||direct?(running&&!e.tired?(nearGoal?5.15:3.75):e.state==='chase'?(nearGoal?3.1:2.35):1.45):0;
 e.speed+=Math.max(-dt*7,Math.min(dt*4,desired-e.speed));
 let travelled=0;
 if(e.path.length||direct){const target=direct?player:cellToWorld(e.path[0]),dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz),step=Math.min(d,e.speed*dt);
  const nx=e.x+dx/Math.max(.001,d)*step,nz=e.z+dz/Math.max(.001,d)*step;
  const safeWorld=cellToWorld(maze.checkpoint),blockedSafe=safe&&Math.hypot(nx-safeWorld.x,nz-safeWorld.z)<2.3;
  if(!mazeSolid(maze.grid,nx,nz,.3)&&!blockedSafe){e.x=nx;e.z=nz;travelled=step;}else{e.speed=0;}
  if(direct){e.cell=worldToCell(e);e.path=[e.cell];}
  else if(d<=step+.001){e.x=target.x;e.z=target.z;e.cell=e.path.shift();if(e.state!=='patrol')e.path=[];}
  if(blockedSafe){e.path=[e.cell];e.last=null;}
  if(step>0){const yaw=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(yaw-e.yaw),Math.cos(yaw-e.yaw));e.yaw+=Math.max(-dt*5,Math.min(dt*5,delta));}
 }
 e.phase+=travelled*(running&&!e.tired?4.4:5.1);e.step+=travelled;
 return {distance,los,sees,travelled,running:running&&!e.tired,cause:e.cause,catchable:distance<.8&&los&&!safe&&!grace};
}
