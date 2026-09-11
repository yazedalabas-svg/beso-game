import * as THREE from 'three';
import {animateCat} from './assets.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.64,...extra});
function box(parent,w,h,d,x,y,z,mat){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);parent.add(o);return o;}
function sphere(parent,r,x,y,z,mat){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),mat);o.position.set(x,y,z);parent.add(o);return o;}
export function actor(g,role){
 const root=new THREE.Group(),model=g.assets.model('marzooq',2.02);if(!model)return root;
 root.name='cinema:'+role;model.rotation.y=Math.PI;root.add(model);
 const bones={},rest={};model.traverse(o=>{if(o.isBone){const name=o.userData.name||o.name;bones[name]=o;rest[name]=o.quaternion.clone();}});
 root.userData={role,cat:{model,bones,rest},skull:new THREE.Object3D()};
 const gold=material(0xd6ad42,{metalness:.55}),black=material(0x101724),green=material(0x5ca770),yellow=material(0xdca83e);
 const clothes=new THREE.Group();root.add(clothes);
 if(role==='beso'){
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.17,.185,.12,24),black);cap.position.set(0,1.91,-.04);clothes.add(cap);
  box(clothes,.37,.035,.23,0,1.865,-.19,black);box(clothes,.085,.05,.02,0,1.93,-.188,gold);
  const coat=new THREE.Mesh(new THREE.CylinderGeometry(.40,.36,1.02,28,1,true,Math.PI+.64,Math.PI*2-1.28),material(0x101724,{side:THREE.DoubleSide}));coat.position.y=1.04;clothes.add(coat);
  for(const side of [-1,1])box(clothes,.035,.17,.06,side*.21,1.52,-.18,gold);
  for(let i=0;i<7;i++){const link=new THREE.Mesh(new THREE.TorusGeometry(.036,.009,5,10),gold);link.position.set(.27+Math.sin(i*.65)*.04,1.54-i*.039,-.22);link.rotation.y=i%2?Math.PI/2:0;clothes.add(link);}
 }else if(role==='marzooq'){
  for(const side of [-1,1]){const pad=sphere(clothes,.155,side*.36,1.51,0,yellow);pad.scale.set(1.1,.65,1);}
  const jacket=new THREE.Mesh(new THREE.CylinderGeometry(.38,.29,.39,24,1,true,Math.PI+.85,Math.PI*2-1.7),material(0xdca83e,{side:THREE.DoubleSide}));jacket.position.y=1.26;clothes.add(jacket);
  box(clothes,.48,.065,.34,0,.91,0,green);const band=new THREE.Mesh(new THREE.TorusGeometry(.168,.017,6,24),green);band.rotation.x=Math.PI/2;band.position.set(0,1.87,-.01);clothes.add(band);sphere(clothes,.035,0,1.88,-.18,gold);
 }else{
  const color=role==='star'?0x946bee:0xffcd57;
  model.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.42,roughness:.3,metalness:.38,transparent:true,opacity:.64,depthWrite:false});}});
  const aura=new THREE.Mesh(new THREE.TorusGeometry(.5,.018,6,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6}));aura.position.y=1.15;root.add(aura);root.userData.aura=aura;
 }
 g.world.add(root);return root;
}
function rotate(root,name,x=0,y=0,z=0){const rig=root.userData.cat,b=rig?.bones[name];if(b)b.quaternion.copy(rig.rest[name]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)));}
function aim(bone,target){
 const origin=bone.getWorldPosition(new THREE.Vector3()),q=bone.getWorldQuaternion(new THREE.Quaternion()),current=new THREE.Vector3(0,1,0).applyQuaternion(q),direction=target.clone().sub(origin).normalize();
 const delta=new THREE.Quaternion().setFromUnitVectors(current,direction),parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();bone.quaternion.copy(parent.multiply(delta.multiply(q)));bone.updateWorldMatrix(false,true);
}
function reach(root,side,target){
 const rig=root.userData.cat,upper=rig.bones[`upper_arm.${side}`],lower=rig.bones[`forearm.${side}`],hand=rig.bones[`hand.${side}`];if(!upper||!lower||!hand)return;
 rotate(root,`upper_arm.${side}`);rotate(root,`forearm.${side}`);rotate(root,`hand.${side}`);root.updateWorldMatrix(true,true);
 const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=hand.getWorldPosition(new THREE.Vector3()),end=root.localToWorld(new THREE.Vector3(...target));
 const l1=a.distanceTo(b),l2=b.distanceTo(c),direction=end.clone().sub(a),distance=Math.min(l1+l2-.005,Math.max(.05,direction.length()));direction.normalize();
 const along=(l1*l1+distance*distance-l2*l2)/(2*distance),bend=new THREE.Vector3(0,-1,0).addScaledVector(direction,direction.y).normalize();
 const elbow=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
 aim(upper,elbow);aim(lower,a.clone().addScaledVector(direction,distance));
 for(const finger of ['index','middle','ring','little'])for(let n=1;n<=3;n++)rotate(root,`${finger}.0${n}.${side}`,1.25);
 rotate(root,`thumb.01.${side}`,.7,0,side==='L'?-.4:.4);rotate(root,`thumb.02.${side}`,1.1);
}
export function pose(root,kind,t,dt=1/60){
 if(!root.userData.cat)return;animateCat(root,t*5,kind==='walk'?1.3:0,dt);
 rotate(root,'chest');rotate(root,'head');rotate(root,'pelvis');
 // نَفَس وتمايل خفيف: الوقفات الثابتة كانت تبدو تماثيل، وهذا اللي يخليها تبدو حية.
 const breath=Math.sin(t*1.55)*.024,sway=Math.sin(t*.83)*.018;
 if(kind==='challenge'||kind==='freeze'){
  rotate(root,'upper_arm.R',-1.0,.1,-.38);rotate(root,'forearm.R',-.65);rotate(root,'hand.R',0,0,.12);rotate(root,'head',0,.15-sway,-.10);rotate(root,'chest',breath,-.14+sway,.035);rotate(root,'pelvis',0,sway*.5,0);
 }else if(kind==='guard'){
  rotate(root,'upper_arm.L',-.72,.2,.40);rotate(root,'upper_arm.R',-.82,-.2,-.4);rotate(root,'forearm.L',-1.1-breath);rotate(root,'forearm.R',-1.2+breath);rotate(root,'head',.06+breath,sway,-.08);rotate(root,'chest',breath*1.4,sway*.6,0);
 }else if(kind==='faceoff'){
  // ميلة قوية للأمام تقرّب الوجهين لبعض فعلًا، مع ذقن نازل ونظرة من تحت الحافة.
  rotate(root,'pelvis',.075,0,0);rotate(root,'chest',.275+breath*1.6,0,0);rotate(root,'head',.205+breath,0,0);
  rotate(root,'upper_arm.L',-.15+breath,0,.315);rotate(root,'forearm.L',-.46-breath);
  rotate(root,'upper_arm.R',-.15+breath,0,-.315);rotate(root,'forearm.R',-.46-breath);
  for(const side of ['L','R']){for(const finger of ['index','middle','ring','little'])for(let n=1;n<=3;n++)rotate(root,`${finger}.0${n}.${side}`,1.42);rotate(root,`thumb.01.${side}`,.8,0,side==='L'?-.45:.45);rotate(root,`thumb.02.${side}`,1.2);}
 }else if(kind==='confess'){
  // رأس نازل وكتفان مستسلمان: مشهد اعتراف، مو ارتداد من ضربة.
  rotate(root,'pelvis',.06,0,0);rotate(root,'chest',.205+breath,0,.04);rotate(root,'head',.335+breath*1.5,.10,0);
  rotate(root,'upper_arm.L',-.18,0,.22);rotate(root,'forearm.L',-.56);
  rotate(root,'upper_arm.R',-.22,0,-.20);rotate(root,'forearm.R',-.76);
 }else if(kind==='punch'){
  const alternate=Math.sin(t*34);
  rotate(root,'chest',0,alternate*.07,0);reach(root,'L',[.21,1.47,-.52-alternate*.15]);reach(root,'R',[-.21,1.4,-.52+alternate*.15]);
 }else if(kind==='recoil'){
  rotate(root,'chest',-.22,0,.13);rotate(root,'head',-.18);rotate(root,'upper_arm.L',-.9,0,.7);rotate(root,'upper_arm.R',-.9,0,-.7);
 }else if(kind==='cap'){
  rotate(root,'upper_arm.R',-1.7,0,-.45);rotate(root,'forearm.R',-1.6);rotate(root,'head',.12,0,-.1);
 }else if(kind==='wind'){
  // الذراع مسحوبة خلف الكتف واللفة كلها محمّلة على الخصر: الإطار اللي قبل الجلدة.
  rotate(root,'chest',0,.52,-.12);rotate(root,'pelvis',0,.22,0);rotate(root,'head',0,.30,-.14);
  rotate(root,'upper_arm.R',-.55,-1.15,-1.05);rotate(root,'forearm.R',-.45);rotate(root,'hand.R',0,0,-.3);
  rotate(root,'upper_arm.L',-.35,.25,.55);rotate(root,'forearm.L',-.7);
 }else if(kind==='slap'){
  // المتابعة بعد الضربة: اللفة انفكّت للجهة الثانية والذراع عبرت الجسم كاملة.
  rotate(root,'chest',0,-.46,.14);rotate(root,'pelvis',0,-.20,0);rotate(root,'head',.05,-.26,.16);
  rotate(root,'upper_arm.R',-1.15,.95,.85);rotate(root,'forearm.R',-.30);rotate(root,'hand.R',0,0,.35);
  rotate(root,'upper_arm.L',-.30,-.2,-.62);rotate(root,'forearm.L',-.95);
 }else if(kind==='plead'){
  // منبطح على وجهه ويرفع يدًا واحدة: وضعية الإغلاق الكوميدي.
  const lift=.5+Math.sin(t*1.6)*.5;
  rotate(root,'chest',.30,0,0);rotate(root,'head',.55,.2,0);
  rotate(root,'upper_arm.R',-1.05-lift*.75,0,-.35);rotate(root,'forearm.R',-.5+lift*.35);
  rotate(root,'upper_arm.L',.35,0,.9);rotate(root,'forearm.L',-.45);
  rotate(root,'thigh.L',.12,0,.2);rotate(root,'thigh.R',.12,0,-.2);
 }else if(kind==='jojo'){
  rotate(root,'chest',0,.2,-.14);rotate(root,'upper_arm.L',-1.7,0,.85);rotate(root,'forearm.L',-1.1);rotate(root,'upper_arm.R',-.5,0,-.65);rotate(root,'forearm.R',-1.4);rotate(root,'head',0,-.2,.16);
 }
 if(root.userData.aura){root.userData.aura.rotation.y=t*.8;root.userData.aura.scale.setScalar(1+Math.sin(t*3)*.06);}
}
