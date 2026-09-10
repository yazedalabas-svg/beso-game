import {pathfind,cellToWorld,worldToCell,lineOfSight,mazeSolid} from './logic.js';
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
export function createPursuer(cell){const p=cellToWorld(cell);return {...p,cell:[...cell],state:'patrol',path:[],last:null,memory:0,energy:100,speed:0,yaw:0,step:0,phase:0,searches:0};}
export function advancePursuer(e,maze,player,dt,options){
 const {random,lit,sprinting,quiet,grace,safe,nearGoal=false}=options;
 const distance=Math.hypot(player.x-e.x,player.z-e.z),los=distance<24&&lineOfSight(maze.grid,e,player);
 const facing=(-Math.sin(e.yaw)*(player.x-e.x)-Math.cos(e.yaw)*(player.z-e.z))/Math.max(.001,distance);
 const sees=!grace&&!safe&&los&&distance<(lit?22:quiet?3.4:6.5)&&(lit||distance<2.6||facing>-.05);
 // Sound follows corridors, so it neither crosses walls at full volume nor requires sight.
 const hearing=sprinting&&!grace&&!safe&&distance<10?pathfind(maze.grid,e.cell,worldToCell(player)).length*3.2:Infinity;
 if(sees){e.state='chase';e.last=worldToCell(player);e.memory=6;e.searches=0;}
 else if(hearing<11){e.last=worldToCell(player);if(e.state!=='chase')e.state='investigate';e.memory=4;}
 else e.memory=Math.max(0,e.memory-dt);
 if(e.state==='chase'&&!sees&&e.memory===0)e.state='search';
 if(safe){e.state='patrol';e.last=null;}
 // Only change routes at tile centres; never turn diagonally through a wall.
 if(!e.path.length){
  let target=e.last;
  if(e.state==='patrol'||!target||(same(e.cell,target)&&!sees)){
   if(e.state!=='patrol'&&++e.searches>2){e.state='patrol';e.last=null;}
   const opts=maze.cells.filter(p=>{const d=Math.abs(p[0]-e.cell[0])+Math.abs(p[1]-e.cell[1]);return d>2&&(e.state==='patrol'||d<8)&&!same(p,maze.checkpoint);});
   target=opts[Math.floor(random()*opts.length)]||maze.start;
  }
  e.path=pathfind(maze.grid,e.cell,target).slice(1);
 }
 const running=e.state==='chase'&&sees&&distance>1.55&&e.energy>(nearGoal?8:18)&&!e.tired;
 e.energy=Math.max(0,Math.min(100,e.energy+(running?-(nearGoal?18:25):12)*dt));
 if(e.energy<=18)e.tired=true;if(e.energy>65)e.tired=false;
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
 return {distance,los,sees,travelled,running:running&&!e.tired,catchable:distance<.8&&los&&!safe&&!grace};
}
