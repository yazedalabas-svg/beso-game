import * as THREE from 'three';
import {animateCat} from './assets.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.64,...extra});
function box(parent,w,h,d,x,y,z,mat){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);parent.add(o);return o;}
function sphere(parent,r,x,y,z,mat){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),mat);o.position.set(x,y,z);parent.add(o);return o;}
// أسطوانة مفتوحة بقوس جزئي: أساس الياقات والمعاطف المفتوحة من الأمام.
function shell(parent,rTop,rBottom,height,x,y,z,mat,arc=Math.PI*2,start=0,open=true){
 const o=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,height,26,1,open,start,arc),mat);o.position.set(x,y,z);parent.add(o);return o;
}
// القلب المتكرر على كتف مرزوق وحزامه: كرتان للفصّين ومخروط مقلوب للطرف.
function heart(parent,size,x,y,z,mat){
 const g=new THREE.Group();
 for(const s of [-1,1])sphere(g,size*.52,s*size*.34,size*.30,0,mat);
 const tip=new THREE.Mesh(new THREE.ConeGeometry(size*.86,size*1.15,18),mat);tip.position.y=-size*.30;tip.rotation.x=Math.PI;g.add(tip);
 g.scale.z=.5;g.position.set(x,y,z);parent.add(g);return g;
}
export function actor(g,role){
 const root=new THREE.Group(),model=g.assets.model('marzooq',2.02);if(!model)return root;
 root.name='cinema:'+role;model.rotation.y=Math.PI;root.add(model);
 const bones={},rest={};model.traverse(o=>{if(o.isBone){const name=o.userData.name||o.name;bones[name]=o;rest[name]=o.quaternion.clone();}});
 root.userData={role,cat:{model,bones,rest},skull:new THREE.Object3D()};
 const gold=material(0xd6ad42,{metalness:.55}),black=material(0x101724),green=material(0x5ca770),yellow=material(0xdca83e);
 const clothes=new THREE.Group();root.add(clothes);
 // الملابس كلها ثابتة على الجذع والرأس والورك — أجزاء الجسم اللي ما تنتقل مع العظام.
 if(role==='beso'){
  const navy=material(0x151d30,{roughness:.75}),drape=material(0x151d30,{roughness:.75,side:THREE.DoubleSide});
  const trim=material(0xd8b24e,{metalness:.72,roughness:.28,emissive:0x3a2a06,emissiveIntensity:1});
  // القبعة: تاج وحافة مائلة وصفيحة ذهبية أمامية، وحزام سفلي يوحي إن الشعر داخلها.
  shell(clothes,.178,.198,.20,0,1.955,-.03,black,Math.PI*2,0,false);
  shell(clothes,.305,.305,.026,0,1.872,-.06,black,Math.PI*2,0,false).rotation.x=-.10;
  shell(clothes,.202,.176,.10,0,1.845,-.05,black,Math.PI*2,0,false);
  box(clothes,.16,.058,.026,0,1.948,-.198,trim);box(clothes,.052,.052,.022,0,1.948,-.206,green);
  // الفتحات الأمامية ضيقة عمدًا. الأقواس الواسعة كانت تخلّي المعطف شريحتين على الجنبين
  // ومن الأمام تشوف عبر الجسم للجدار — الشخصية تطلع شبه عارية في أي لقطة مواجهة.
  shell(clothes,.215,.17,.32,0,1.70,-.02,drape,Math.PI*2-.30,Math.PI+.15).rotation.x=-.11;
  // المعطف يلاصق الجذع (نصف قطر الجسم ~.28) ويتّسع عند الذيل فقط. الإصدار السابق كان
  // بنصف قطر .43 عند الصدر — أوسع من مدى الذراعين، فيبتلعهما ويطلع الشكل كبرميل.
  shell(clothes,.30,.285,.58,0,1.26,0,drape,Math.PI*2-.16,Math.PI+.08);
  shell(clothes,.285,.40,.66,0,.64,0,drape,Math.PI*2-.14,Math.PI+.07);
  for(const side of [-1,1]){const pad=sphere(clothes,.126,side*.25,1.555,0,navy);pad.scale.set(1.15,.62,1.05);box(clothes,.044,.19,.06,side*.185,1.49,-.185,trim);}
  for(let i=0;i<4;i++)box(clothes,.04,.04,.022,-.085,1.42-i*.115,-.20,trim);
  // سلسلة ذهبية تلتف حول الرقبة فعلًا بدل صفّ مائل على الصدر.
  for(let i=0;i<14;i++){const a=(i/14)*Math.PI*2,link=new THREE.Mesh(new THREE.TorusGeometry(.028,.0075,5,10),trim);
   link.position.set(Math.sin(a)*.175,1.60-Math.max(0,Math.cos(a))*.12,-.03-Math.cos(a)*.135);link.rotation.set(Math.PI/2,i%2?Math.PI/2:0,0);clothes.add(link);}
  box(clothes,.37,.058,.27,0,.99,0,trim);
 }else if(role==='marzooq'){
  const amber=material(0xe0aa38,{roughness:.52}),drape=material(0xe0aa38,{roughness:.52,side:THREE.DoubleSide});
  const jade=material(0x3f9e6a,{roughness:.40,metalness:.25});
  const trim=material(0xe8c65a,{metalness:.78,roughness:.22,emissive:0x4a3708,emissiveIntensity:1});
  // عصابة الرأس بحجر قلبي ذهبي في المنتصف.
  const band=new THREE.Mesh(new THREE.TorusGeometry(.174,.027,8,26),jade);band.rotation.x=Math.PI/2;band.position.set(0,1.885,-.01);clothes.add(band);
  heart(clothes,.072,0,1.902,-.183,trim);
  // كتفيّات بقلوب بارزة: العلامة اللي تعرّفه من ظله وحده.
  for(const side of [-1,1]){const pad=sphere(clothes,.138,side*.255,1.565,0,amber);pad.scale.set(1.18,.66,1.06);heart(clothes,.078,side*.275,1.578,-.115,trim);}
  shell(clothes,.205,.165,.28,0,1.73,-.02,drape,Math.PI*2-.30,Math.PI+.15);
  // السترة تتّسع للأسفل وتوصل للكتف. كانت معكوسة (أوسع عند الصدر) وقصيرة، فتطلع كطوق
  // أصفر معلّق وبينه وبين الياقة فراغ من الجسم العاري. والفتحة الأمامية ضاقت لـ٣١°:
  // الفتحة الواسعة كانت تخلّي الناظر يشوف ظهر الأسطوانة من الأمام، فتقرأ السترة كلوحين
  // أصفرين على الجنبين بدل ثوب ملتف على جسمه.
  shell(clothes,.29,.335,.62,0,1.30,0,drape,Math.PI*2-.18,Math.PI+.09);
  box(clothes,.40,.072,.30,0,.94,0,jade);heart(clothes,.075,0,.94,-.172,trim);
  for(const side of [-1,1])box(clothes,.14,.052,.185,side*.145,.52,.01,jade);
  // وشاح ينزل من الرقبة على الظهر، يعطي حركة في اللقطات الجانبية.
  box(clothes,.24,.78,.03,0,1.27,.185,drape).rotation.x=-.05;
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
