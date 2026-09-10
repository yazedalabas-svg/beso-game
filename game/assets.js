import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
export const assetURL=p=>globalThis.__BESO_ASSETS?.[p]||p;
const names=['marzooq','door','nightstand','flashlight','almond','bat','mouse','backrooms'];
export class GameAssets {
 constructor(){this.models={};this.errors=[];this.ready=Promise.all(names.map(async name=>{try{const gltf=await new GLTFLoader().loadAsync(assetURL(`/models/${name}.glb`));this.models[name]=gltf.scene;}catch(e){this.errors.push(name);console.warn('Model unavailable',name,e);}}));}
 model(name,height){
  const source=this.models[name];if(!source)return null;
  const scene=clone(source);
  scene.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.frustumCulled=!o.isSkinnedMesh;}});
  // Correct source axes before measuring. Door width was authored along Z.
  const oriented=new THREE.Group();oriented.add(scene);if(name==='door')scene.rotation.y+=Math.PI/2;
  oriented.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(oriented),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const k=height/Math.max(.001,name==='flashlight'?size.z:size.y);
  oriented.scale.setScalar(k);oriented.position.set(-center.x*k,-(name==='flashlight'?center.y:box.min.y)*k,-center.z*k);
  const root=new THREE.Group();root.name='asset:'+name;root.add(oriented);return root;
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
