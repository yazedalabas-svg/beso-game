import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMaze,mazeSolid,cellToWorld,seeded,endingFor} from './logic.js';
import {createPursuer,advancePursuer} from './pursuit.js';
test('four explicit endings and evidence gates',()=>{
 for(const evidenceRoom of [false,true])for(const evidenceMaze of [false,true]){const f={evidenceRoom,evidenceMaze};assert.equal(endingFor(f,'trust'),'comedy');assert.equal(endingFor(f,'unknown'),'loop');assert.equal(endingFor(f,'control'),evidenceRoom&&evidenceMaze?'secret':null);assert.equal(endingFor(f,'leave'),evidenceRoom&&evidenceMaze?'truth':'loop');}
 assert.equal(endingFor({},'invalid'),null);
});
test('power boxes use three distinct wall-mounted cells',()=>{
 for(let seed=1;seed<=40;seed++){const maze=createMaze(seed),cells=new Set(maze.powerPoints.map(p=>p.cell.join(',')));assert.equal(cells.size,maze.powerPoints.length,`seed ${seed}`);for(const {cell:[x,z],wall:[dx,dz]} of maze.powerPoints)assert.equal(maze.grid[z+dz]?.[x+dx],1,`seed ${seed} missing wall`);}
});
test('pursuer never cuts corners across varied mazes and frame rates',()=>{
 for(let seed=1;seed<=20;seed++){const maze=createMaze(seed),e=createPursuer(maze.exit),random=seeded(seed+99);let travelled=0;for(let i=0;i<3600;i++){const p=cellToWorld(maze.path[Math.floor(i/90)%maze.path.length]);const r=advancePursuer(e,maze,p,i%3===0?.05:1/60,{random,lit:true,sprinting:i%120<60,quiet:false,grace:false,safe:false});assert.equal(mazeSolid(maze.grid,e.x,e.z,.29),false,`seed ${seed} step ${i}`);assert.ok(Number.isFinite(e.x+e.z+e.speed));assert.ok(e.speed<=3.75+.001);travelled+=r.travelled;}assert.ok(travelled>40);}
});
test('hidden quiet player cannot update remembered location through walls',()=>{
 const maze=createMaze(41),e=createPursuer(maze.start),random=seeded(91);e.state='chase';e.last=[...maze.start];e.memory=5;const hidden=cellToWorld(maze.exit);advancePursuer(e,maze,hidden,.05,{random,lit:false,sprinting:false,quiet:true,grace:false,safe:false});assert.deepEqual(e.last,maze.start);
});
test('safe room blocks catches without freezing patrol',()=>{
 const maze=createMaze(7),e=createPursuer(maze.exit),random=seeded(8),player=cellToWorld(maze.checkpoint);let moved=0;for(let i=0;i<1200;i++){const r=advancePursuer(e,maze,player,.05,{random,lit:true,sprinting:false,quiet:false,grace:false,safe:true});assert.equal(r.catchable,false);moved+=r.travelled;}assert.ok(moved>10);
});
test('chase sprint recovers after fatigue and reaches off-centre players',()=>{
 const grid=Array.from({length:5},(_,z)=>Array.from({length:150},(_,x)=>z===0||z===4||x===0||x===149?1:0));
 const cells=[];for(let z=1;z<4;z++)for(let x=1;x<149;x++)cells.push([x,z]);
 const maze={grid,cells,checkpoint:[1,1],start:[1,2]},random=seeded(8),e=createPursuer([2,2]);let tired=false,recovered=false;
 for(let i=0;i<1000;i++){const r=advancePursuer(e,maze,{x:e.x+12,z:e.z},.03,{random,lit:true,sprinting:false,quiet:false,grace:false,safe:false});if(e.tired)tired=true;if(tired&&r.running)recovered=true;}
 assert.ok(tired&&recovered);
 const close=createPursuer([2,2]),player={x:7.5,z:7.5};let caught=false;
 for(let i=0;i<180;i++){const r=advancePursuer(close,maze,player,1/60,{random,lit:true,sprinting:false,quiet:false,grace:false,safe:false});caught ||= r.catchable;}
 assert.ok(caught);
});
