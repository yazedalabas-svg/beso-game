import {build} from 'esbuild';
import {readFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const three=pathToFileURL(resolve('node_modules/three/build/three.module.js')).href;
const out=resolve('work/runtime-check.bundle.mjs');mkdirSync(resolve('work'),{recursive:true});
await build({entryPoints:['game/engine.js'],bundle:true,external:['file://*'],platform:'node',format:'esm',outfile:out,plugins:[{name:'headless-renderer',setup(b){b.onResolve({filter:/^three$/},()=>({path:'three-test',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export * from '${three}';import {Texture} from '${three}';
// بديل TextureLoader بنفس واجهة three اللي يعتمد عليها GLTFLoader (setCrossOrigin/‏setRequestHeader/‏onLoad)
export class TextureLoader{
 constructor(){this.crossOrigin='anonymous';}
 setCrossOrigin(v){this.crossOrigin=v;return this;}
 setRequestHeader(v){this.requestHeader=v;return this;}
 setPath(v){this.path=v;return this;}
 load(url,onLoad){const t=new Texture();t.image={width:64,height:64};if(onLoad)queueMicrotask(()=>onLoad(t));return t;}
}
export class WebGLRenderer{constructor(){this.domElement={remove(){},requestPointerLock(){}};}setPixelRatio(){}setSize(){}setClearColor(){}render(){}dispose(){}}`,loader:'js'}));}}]});
const noop=()=>{};
globalThis.window=globalThis;globalThis.self=globalThis;
globalThis.addEventListener=noop;globalThis.removeEventListener=noop;
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
globalThis.devicePixelRatio=1;globalThis.matchMedia=()=>({matches:false});
globalThis.ProgressEvent=class {constructor(type,data){this.type=type;Object.assign(this,data);}};
globalThis.createImageBitmap=async()=>({width:1024,height:1024,close:noop});
const ctx=new Proxy({},{get:(_,key)=>key==='measureText'?()=>({width:80}):noop,set:()=>true});
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>ctx}),addEventListener:noop,removeEventListener:noop,pointerLockElement:null,exitPointerLock:noop};
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.Audio=class{constructor(){this.currentTime=0;}play(){return Promise.resolve();}pause(){}};
// نفحص نفس الملفات اللي تنشحن فعلاً في النسخة المستقلة: build/ إن وُجدت وإلا public/
const modelDir=existsSync('build/models')?'build/models':'public/models';
globalThis.__BESO_ASSETS={};for(const file of readdirSync(modelDir).filter(f=>f.endsWith('.glb')))globalThis.__BESO_ASSETS['/models/'+file]='data:model/gltf-binary;base64,'+readFileSync(modelDir+'/'+file).toString('base64');
console.log('models from',modelDir);
const {BesoGame}=await import(pathToFileURL(out).href+'?v='+Date.now());
let snapshot,emits=0;const g=new BesoGame({clientWidth:1280,clientHeight:720,appendChild:noop},s=>{snapshot=s;emits++;});
await g.assets.ready;
const T=await import(three);
for(const [name,limit] of [['marzooq',3],['flashlight',.31]]){const o=g.assets.model(name,name==='marzooq'?2.02:.3);const size=new T.Box3().setFromObject(o).getSize(new T.Vector3());assert.ok(Math.max(size.x,size.y,size.z)<limit,`${name} has invalid bounds`);}
const doorSize=new T.Box3().setFromObject(g.assets.model('door',2.58)).getSize(new T.Vector3());assert.ok(doorSize.x>doorSize.z*3,'door must face the room');
assert.deepEqual(g.assets.errors,[]);assert.ok(g.marzooq.userData.cat.bones.head);assert.ok(g.marzooq.userData.cat.bones['thigh.L']);
await g.start();assert.equal(g.materials.metal.visible,true);assert.equal(g.mode,'intro');g.skipIntro();assert.equal(g.mode,'play');
g.target={id:'flashlight',object:{visible:true}};g.interact();g.target={id:'key',object:{visible:true}};g.interact();g.changeMode('puzzle');g.puzzle=[];for(const p of ['coffee','clock','door'])g.chooseSymbol(p);assert.equal(g.flags.memorySolved,true);g.closeRead();g.target={id:'door'};g.interact();assert.equal(g.level,'maze');
g.target={id:'letter',object:{visible:true}};g.interact();g.target={id:'recording'};g.interact();assert.ok(g.flags.evidenceRoom&&g.flags.evidenceMaze);g.closeRead();
assert.equal(g.maze.size,25);assert.ok(g.maze.rooms.length>=3&&g.powerBoxes.length>=3&&g.scareZones.length>=3);
let pickup=g.interactables.find(x=>x.id==='backpack');g.target=pickup;g.interact();assert.equal(g.flags.backpack,true);
pickup=g.interactables.find(x=>x.id.startsWith('mushroom'));g.stamina=12;g.target=pickup;g.interact();assert.ok(g.stamina>12&&g.flags.mushrooms.length===1);
g.startBlackout();assert.equal(g.powerOut,true);assert.equal(g.mode,'event');const eventEmits=emits;for(let i=0;i<60;i++)g.updateEvent(1/60);assert.ok(emits-eventEmits<=2,'event dialogue must not re-render every frame');g.skipEvent();assert.equal(g.mode,'play');const breaker=g.interactables.find(x=>x.id===`breaker${g.activeBreaker}`);g.target=breaker;g.interact();assert.equal(g.powerOut,false);assert.equal(g.flags.powerRestores,1);
for(const [choice,ending] of [['leave','truth'],['trust','comedy'],['unknown','loop'],['control','secret']]){
 g.changeMode('choice');g.decide(choice);assert.equal(g.mode,'cinematic');assert.equal(g.ending,ending);
 // Exercise scene camera, rig updates, timeline dialogue and natural completion.
 let stamp=g.previous;for(let i=0;i<1500&&g.mode==='cinematic';i++){stamp+=50;g.update(stamp);}
 assert.equal(g.mode,'ending');assert.equal(snapshot.ending.label.length>0,true);g.replayCinema();assert.equal(g.mode,'cinematic');g.finishCinema();g.returnToChoice();assert.equal(g.mode,'choice');assert.equal(g.level,'maze');
}
assert.equal(g.unlocked.length,4);assert.ok(g.saved);assert.equal(g.scene.children.filter(o=>o===g.world).length,1);g.dispose();console.log('PASS: actual GLB skin load; room puzzle; evidence; four animated timelines; replay; return to choice; checkpoint preservation.');

