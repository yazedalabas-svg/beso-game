import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
export const assetURL=p=>globalThis.__BESO_ASSETS?.[p]||p;
const names=['marzooq','door','flashlight','almond','bat','mouse','backrooms',
 'fluorescent','breaker','camera','battery','energy','backpack','bed','locker','filing','boxes','fan','monitor','warnings','mushroom',
 'rr-tv-table','rr-plush-bunny','rr-rail-post','rr-door-frame'];
// صفحات Artifact تمنع fetch/XHR تمامًا (connect-src 'none')، و GLTFLoader.load يستعمل fetch.
// فنفكّ الـ data URI محليًا ونستخدم parse — بدون أي طلب شبكة.
function decodeDataURI(uri){
 const comma=uri.indexOf(',');const binary=atob(uri.slice(comma+1));const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes.buffer;
}
// GLTFLoader يختار ImageBitmapLoader (وهو يستعمل fetch) متى ما كان createImageBitmap موجودًا،
// والقرار يصير داخل parse() لا داخل الباني. نخفيه أثناء الاستدعاء المتزامن فقط، فيستعمل
// TextureLoader اللي يحمّل الصور عبر <img> — و data: مسموحة تحت سياسة صفحات Artifact.
function parseWithoutFetch(buffer){
 return new Promise((resolve,reject)=>{
  const native=globalThis.createImageBitmap;
  const hidden=native!==undefined&&delete globalThis.createImageBitmap;
  try{new GLTFLoader().parse(buffer,'',resolve,reject);}
  finally{if(hidden)globalThis.createImageBitmap=native;}
 });
}
async function loadModel(path){
 const source=assetURL(path);
 const buffer=source.startsWith('data:')?decodeDataURI(source):await (await fetch(source)).arrayBuffer();
 return parseWithoutFetch(buffer);
}
function cloneRenderable(source){
 const scene=clone(source);
 scene.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.frustumCulled=!o.isSkinnedMesh;}});
 return scene;
}
function normalizeModel(scene,name,height){
 // Correct source axes before measuring. Door width was authored along Z; the bed
 // source was authored standing on its long edge (Y was its 14-unit length).
 const oriented=new THREE.Group();oriented.add(scene);if(name==='door')scene.rotation.y+=Math.PI/2;else if(name==='bed')scene.rotation.x-=Math.PI/2;
 oriented.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(oriented),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const k=height/Math.max(.001,name==='flashlight'?size.z:size.y);
 oriented.scale.setScalar(k);oriented.position.set(-center.x*k,-(name==='flashlight'?center.y:box.min.y)*k,-center.z*k);
 const root=new THREE.Group();root.name='asset:'+name;root.add(oriented);return root;
}
export class GameAssets {
 constructor(){this.models={};this.errors=[];this.ready=Promise.all(names.map(async name=>{try{const gltf=await loadModel(`/models/${name}.glb`);this.models[name]=gltf.scene;}catch(e){this.errors.push(name);console.warn('Model unavailable',name,e);}}));}
 model(name,height){
  const source=this.models[name];if(!source)return null;
  return normalizeModel(cloneRenderable(source),name,height);
 }
 part(name,partName,height){
  const source=this.models[name]?.getObjectByName(partName);if(!source)return null;
  return normalizeModel(cloneRenderable(source),name+':'+partName,height);
 }

}
// FK gait on the supplied skin: planted stance, lifted swing foot and opposing arms.
export function animateCat(root,phase,speed,dt){
 const rig=root.userData.cat;if(!rig)return;
 const moving=speed>.05,run=speed>2.3,a=moving?(run?.57:.36):.012;
 for(const [side,offset] of [['L',0],['R',Math.PI]]){
  const t=phase+offset,s=Math.sin(t),swing=Math.max(0,-s);
  for(const [name,x,z] of [[`thigh.${side}`,s*a,0],[`shin.${side}`,swing*(run?.95:.58),0],[`foot.${side}`,-swing*.3,0],[`upper_arm.${side}`,-s*a*.7,side==='L'?.16:-.16],[`forearm.${side}`,-.18-(run?.35:0),0]]){
   const b=rig.bones[name];if(b){const q=rig.rest[name].clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,0,z)));b.quaternion.slerp(q,1-Math.exp(-14*dt));}
  }
 }
 for(let i=1;i<=8;i++){const name=`tail.${String(i).padStart(2,'0')}`,b=rig.bones[name];if(b)b.quaternion.copy(rig.rest[name]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.sin(phase*.45-i*.4)*.10)));}
 if(rig.bones.head)rig.bones.head.quaternion.copy(rig.rest.head).multiply(root.userData.skull.quaternion);
 rig.model.position.y=moving?Math.abs(Math.cos(phase))*.018:Math.sin(phase)*.003;
}
