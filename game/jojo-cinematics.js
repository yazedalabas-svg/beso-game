import * as THREE from 'three';
import STORY from './cinema-story.json';
import {actor,pose} from './cinema-actors.js';

const mix=THREE.MathUtils.lerp;
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
function camera(g,position,target,fov=48){g.camera.position.set(...position);g.camera.lookAt(...target);if(g.camera.fov!==fov){g.camera.fov=fov;g.camera.updateProjectionMatrix();}}
function sign(g,text,x,y,z,width=3,bg='#17211f',fg='#f4df9d'){const s=g.sign(text,width,.45,bg,fg);s.position.set(x,y,z);g.world.add(s);return s;}
function prop(g,name,height,x,y,z,parent=g.world){const o=g.assets.model(name,height);if(o){o.position.set(x,y,z);parent.add(o);}return o;}
const glow=(color,intensity)=>mat(color,{emissive:color,emissiveIntensity:intensity});
// شارع ليلي قبل الفجر: قمر منخفض، أفق بعيد، أعمدة إنارة ترمي برك ضوء على إسفلت مبلول.
function street(g){
 g.scene.background=new THREE.Color(0x241d3a);g.scene.fog.color.setHex(0x3b2f52);g.scene.fog.density=.0175;
 // الأسفلت: لمعان عالٍ وخشونة منخفضة عشان ينعكس عليه ضوء الأعمدة والأورا.
 g.mesh(17,.2,46,mat(0x3b3546,{roughness:.34,metalness:.42}),0,-.12,0);
 g.mesh(5.4,.012,46,mat(0x4a4356,{roughness:.22,metalness:.55}),0,.005,0); // مسار مبلول في منتصف الطريق
 for(let z=-20;z<22;z+=3)g.mesh(.09,.014,1.2,glow(0xe7d3a2,.35),0,.016,z);
 const disc=new THREE.Mesh(new THREE.SphereGeometry(2.6,22,16),new THREE.MeshBasicMaterial({color:0xf5ecd0}));
 disc.position.set(-13,15,-34);g.world.add(disc);
 const halo=new THREE.Mesh(new THREE.SphereGeometry(4.6,20,14),new THREE.MeshBasicMaterial({color:0xbfa9e6,transparent:true,opacity:.16}));
 halo.position.copy(disc.position);g.world.add(halo);
 for(const side of [-1,1]){
  g.mesh(1.7,.16,46,mat(0x8d7f74,{roughness:.85}),side*6.25,.03,0);
  g.mesh(.14,.30,46,mat(0x6d6259),side*5.42,.14,0); // حافة الرصيف
  for(let i=0;i<8;i++){
   const z=-19+i*6,height=5.4+(i%3)*1.1,tone=[0x4a382f,0x5b4c43,0x40403f][i%3];
   g.mesh(3.6,height,5.6,mat(tone,{roughness:.92}),side*8.1,height/2,z);
   g.mesh(3.9,.26,5.9,mat(0x322824),side*8.1,height,z); // إفريز علوي يكسر الكتلة
   for(let row=0;row<4;row++)for(let n=0;n<2;n++){
    const y=1.2+row*1.35;if(y>height-.8)continue;
    // بعض النوافذ مضاءة وبعضها مطفأة — التوزيع ثابت لكل مبنى فما يرجف بين الإعادات.
    const on=((i*7+row*3+n*5+(side>0?1:0))%5)<2;
    g.mesh(.08,.95,.85,on?glow(0xffd88f,.9):mat(0x222a33),side*6.31,y,z-1.4+n*2);
    g.mesh(.13,.09,1.05,mat(0xb8a288),side*6.22,y-.52,z-1.4+n*2);
   }
  }
  // أعمدة الإنارة: رأس مضيء + ضوء نقطي حقيقي يرسم بركة على الأسفلت.
  for(const z of [-13,-1,11]){
   g.mesh(.08,4.2,.08,mat(0x1f232c),side*5.65,2.1,z);
   g.mesh(.5,.10,.34,glow(0xffe6b2,2.6),side*5.4,4.16,z);
   const lamp=new THREE.PointLight(0xffd79a,16,13,1.7);lamp.position.set(side*5.3,4.0,z);g.world.add(lamp);
   const pool=new THREE.Mesh(new THREE.CircleGeometry(2.5,24),new THREE.MeshBasicMaterial({color:0xffd79a,transparent:true,opacity:.07}));
   pool.rotation.x=-Math.PI/2;pool.position.set(side*5.0,.022,z);g.world.add(pool);
  }
 }
 // أفق بعيد خلف الشارع يمنع الإحساس إن الدنيا تنتهي عند آخر مبنى.
 for(let i=0;i<14;i++){const h=4+((i*37)%9);g.mesh(3.2,h,1.6,mat(0x2a2340),-22+i*3.4,h/2,-30);}
 // ليل: حافة بنفسجية باردة من جهة القمر ومفتاح دافئ خافت من جهة الأعمدة.
 const rim=new THREE.DirectionalLight(0x9a83f0,1.55);rim.position.set(-5,6,4);g.world.add(rim);
 const key=new THREE.DirectionalLight(0xffc78d,1.35);key.position.set(4,6,-3);g.world.add(key);
 g.world.add(new THREE.HemisphereLight(0x5b4f85,0x1d1826,.55));
}
// ممر الباك رومز للنهاية الثالثة: أبواب مصمتة على الجانبين وسقف نيون بعضه ميت.
function corridor(g){
 g.scene.background=new THREE.Color(0x0d1109);g.scene.fog.color.setHex(0x1c220f);g.scene.fog.density=.034;
 g.mesh(7,.2,34,g.materials.floor,0,-.12,-7);g.mesh(7,.15,34,mat(0x6f6b4e),0,3.2,-7);
 for(const side of [-1,1]){
  g.mesh(.2,3.3,34,g.materials.wall,side*3.5,1.6,-7);
  g.mesh(.05,.13,34,mat(0x4c4a33),side*3.38,.30,-7); // وزرة سفلية
  for(let i=0;i<6;i++){const z=1-i*4.5;
   g.mesh(.06,2.05,.95,mat(0x3c4227,{roughness:.9}),side*3.37,1.02,z); // باب مغلق
   g.mesh(.05,.06,.06,glow(0xb9b57e,.5),side*3.33,1.05,z+.36);          // مقبض
   g.mesh(.05,.26,.42,mat(0x20240f),side*3.34,2.22,z);                  // لوحة رقم فوق الباب
  }
 }
 for(let i=0;i<8;i++){
  const z=3-i*4.5,dead=i===2||i===5; // أنبوبان ميتان يخلقان مناطق عتمة يمشون فيها
  g.mesh(.42,.05,1.25,dead?mat(0x3a3a28):glow(0xe8e8b4,1),0,3.1,z);
  if(dead)continue;
  const l=new THREE.PointLight(0xf2edb7,5.5,7.5);l.position.set(0,2.8,z);g.world.add(l);
 }
 g.world.add(new THREE.HemisphereLight(0x4d5232,0x14170c,.7));
}
// غرفة المراقبة للنهاية الرابعة: النهاية كانت تدور عن شاشات وتسجيلات وهي واقفة في الشارع.
function controlRoom(g){
 g.scene.background=new THREE.Color(0x0a1013);g.scene.fog.color.setHex(0x121b1f);g.scene.fog.density=.030;
 g.mesh(11.5,.2,13,mat(0x24282a,{roughness:.5,metalness:.25}),0,-.12,.5);
 g.mesh(11.5,.2,13,mat(0x1a1e20),0,3.7,.5);
 for(const side of [-1,1])g.mesh(.25,3.9,13,mat(0x2b3134,{roughness:.85}),side*5.4,1.85,.5);
 g.mesh(11.5,3.9,.25,mat(0x2b3134,{roughness:.85}),0,1.85,-5.6);
 g.mesh(11.5,3.9,.25,mat(0x2b3134,{roughness:.85}),0,1.85,6.6);
 // جدار شاشات خلف المكتب: كل شاشة بضوء خافت مختلف فتعطي وميضًا باردًا على الوجوه.
 for(let row=0;row<3;row++)for(let i=0;i<7;i++){
  const x=-3.6+i*1.2,y=1.35+row*.82,live=((i*3+row*5)%4)!==0;
  g.mesh(1.06,.72,.06,mat(0x14181a),x,y,-5.4);
  g.mesh(.94,.60,.02,live?glow(0x5d97a0,1.15):mat(0x101314),x,y,-5.35);
 }
 const wash=new THREE.PointLight(0x6fb6c0,16,18,1.4);wash.position.set(0,2.1,-3.2);g.world.add(wash);
 const front=new THREE.PointLight(0x9fd4d0,11,16,1.5);front.position.set(0,2.6,3.2);g.world.add(front);
 // كابلات معلّقة من السقف وأنابيب على الجدران — الغرفة تبدو مشتغلة مو فاضية.
 for(let i=0;i<9;i++){const x=-4.4+i*1.1;g.mesh(.035,1.15+((i*13)%5)*.18,.035,mat(0x15191b),x,3.1,2.4+((i*7)%3)*.7);}
 for(const side of [-1,1])g.mesh(.16,.16,12.6,mat(0x39413f),side*5.2,3.28,.5);
 const strip=new THREE.PointLight(0xa8d6cf,6,16,1.4);strip.position.set(0,3.35,2.5);g.world.add(strip);
 g.world.add(new THREE.HemisphereLight(0x45646b,0x101618,.85));
}
function effects(g){
 const c=g.cinemaProps;
 c.rings=Array.from({length:3},(_,i)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(.48,.025,6,48),new THREE.MeshBasicMaterial({color:i%2?0xc6adff:0xffe69a,transparent:true,opacity:0}));m.position.set(0,1.3,.3);g.world.add(m);return m;});
 const geo=new THREE.BufferGeometry(),positions=[];for(let i=0;i<100;i++)positions.push(Math.sin(i*15.1)*3,.2+(i%17)/6,Math.cos(i*7.9)*3);
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));c.dust=new THREE.Points(geo,new THREE.PointsMaterial({color:0xf7d88b,size:.035,transparent:true,opacity:.65}));g.world.add(c.dust);
}
export function beginCinema(g,id){
 g.clearWorld();g.level='cinema';g.cinemaTime=0;g.cinemaBeat=-1;g.cinemaStep=-1;g.cinemaId=id;g.cinemaDuration=STORY[id].duration;g.cinemaFx='';g.cinemaGraphic='';g.cinemaCard='';g.cinemaCaption='';g.cinemaProps={};g.cinemaHit=-1;g.lastCinemaFx='';g.marzooq.visible=false;g.torch.intensity=0;g.hand.visible=false;g.threat=0;
 g.fill.intensity=1.05;g.fill.color.setHex(0xc8cbeb);g.sounds.stopVoice();g.sounds.stopEffects();g.sounds.cinematic(id);
 if(id==='loop')corridor(g);else if(id==='secret')controlRoom(g);else street(g);
 const c=g.cinemaProps;c.beso=actor(g,'beso');c.marzooq=actor(g,'marzooq');c.star=actor(g,'star');c.world=actor(g,'world');c.star.visible=c.world.visible=false;
 c.beso.rotation.y=Math.PI;c.marzooq.rotation.y=0;c.beso.position.set(0,0,-2);c.marzooq.position.set(0,0,3.2);effects(g);
 const key=new THREE.PointLight(id==='loop'?0xe3e6bd:0xffddb0,24,13);key.position.set(1,3,1);g.world.add(key);c.light=key;
 if(id==='truth'){
  g.mesh(4,3.7,.3,mat(0x6a625b),-2.9,1.85,4);g.mesh(4,3.7,.3,mat(0x6a625b),2.9,1.85,4);
  // بابه كان يدور حول مركزه، لا حول مفصلته — فيطلع كأنه عمود رفيع يلف في نص الفتحة بدل
  // ما ينفتح على الجدار زي باب حقيقي. نفس أسلوب doorHinge المستعمل بغرفة بيسو: مجموعة
  // عند حافة المفصلة، والباب نفسه مزاح داخلها بنص عرضه (~.66م لموديل بعرض ~1.32م).
  c.doorHinge=new THREE.Group();c.doorHinge.position.set(-.66,0,4);g.world.add(c.doorHinge);
  c.door=prop(g,'door',2.8,.66,0,0,c.doorHinge);
  sign(g,'خارج الممرات',0,3.25,3.82,2.4).rotation.y=Math.PI;c.beso.visible=false;c.marzooq.visible=false;
  // ممر باك رومز قصير يظهر عبر فتحة الباب — عشان يبين إن بيسو طلع فعلاً من مكان، لا من عدم.
  const brWall=mat(0x8d8352,{roughness:.92}),brFloor=mat(0x746a3e,{roughness:.95}),brCeil=mat(0x4d4a2e);
  g.mesh(1.8,.06,6,brFloor,0,-.03,7);g.mesh(1.8,.06,6,brCeil,0,3.58,7);
  for(const side of [-1,1])g.mesh(.06,3.6,6,brWall,side*.9,1.78,7);
  for(let i=0;i<3;i++){const z=4.6+i*1.8;g.mesh(.9,.05,.32,mat(0xe8e8b4,{emissive:0xe8e8b4,emissiveIntensity:i===1?.15:1}),0,3.5,z);const l=new THREE.PointLight(0xeee6a0,i===1?1.2:4.5,5);l.position.set(0,3.2,z);g.world.add(l);}
  // غلاف الأورا الذهبي حول بيسو في المشية الأخيرة — مفتوح الطرفين وبدون كتابة عمق عشان يلتف حوله لا يحجبه.
  c.aura=new THREE.Mesh(new THREE.CylinderGeometry(.78,.3,2.9,22,1,true),new THREE.MeshBasicMaterial({color:0xffcf6b,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  c.aura.position.y=1.45;c.aura.visible=false;g.world.add(c.aura);
 }else if(id==='comedy'){
  sign(g,'غرفة المصالحة',0,3,-3.8,4);c.beso.position.set(-1.25,0,0);c.beso.rotation.y=-Math.PI/2;c.marzooq.position.set(1.25,0,0);c.marzooq.rotation.y=Math.PI/2;
  g.mesh(1.4,.12,1.2,mat(0x66432d),0,.85,0);g.mesh(.16,.8,.16,mat(0x392e2b),0,.4,0);
  prop(g,'almond',.2,.3,.92,0);prop(g,'almond',.2,-.3,.92,0);
  c.bed=prop(g,'bed',.75,0,0,-2.4);if(c.bed)c.bed.visible=false;c.roomDoor=prop(g,'door',2.7,0,0,-3.4);if(c.roomDoor)c.roomDoor.visible=false;
 }else if(id==='loop'){
  c.door=prop(g,'door',2.65,0,0,-11.5);sign(g,'الباب الحقيقي',0,2.9,-11.8,1.8);c.beso.position.set(-.9,0,-5.2);c.beso.rotation.y=-.18;c.marzooq.position.set(.65,0,-8.2);c.marzooq.rotation.y=Math.PI+.15;
 }else{
  sign(g,'غرفة المراقبة / تسجيل ٠١٧',0,3.15,-5.2,4.5,'#162021','#b9d1c7');
  // مكتب تحكّم بثلاث شاشات وكرسي مقلوب: الغرفة انفكّ منها أحد على عجل.
  g.mesh(4.3,.13,1.05,mat(0x2b3132,{roughness:.55,metalness:.3}),0,.85,-2.7);
  for(const dx of [-1.9,1.9])g.mesh(.12,.78,.9,mat(0x20262a),dx,.43,-2.7);
  for(let i=0;i<3;i++){const mon=prop(g,'monitor',.65,-1.3+i*1.3,.92,-2.7);if(mon)mon.rotation.y=Math.PI;}
  g.mesh(.9,.1,.85,mat(0x33393b),1.1,.46,-1.5).rotation.z=.42;
  g.mesh(.07,.55,.07,mat(0x22282a),1.1,.2,-1.5);
  // نفس تصحيح المفصلة: الباب يدور حول حافته لا حول مركزه.
  c.doorHinge=new THREE.Group();c.doorHinge.position.set(-.66,0,4.4);g.world.add(c.doorHinge);
  c.door=prop(g,'door',2.75,.66,0,0,c.doorHinge);
  g.mesh(1.5,2.95,.16,mat(0x353d3f),0,1.48,4.55); // إطار الباب المعدني
  c.beso.position.set(-.8,0,0);c.beso.rotation.y=Math.PI;c.marzooq.position.set(.9,0,-.4);c.marzooq.rotation.y=Math.PI;
  c.entity=c.world;c.entity.visible=false;c.entity.position.set(0,0,5.2);c.entity.scale.setScalar(1.4);
 }
 g.changeMode('cinematic');
}
// لحظة الجلدة. كل توقيتات الفصل الأخير مشتقة منها عشان تعديلها ما يكسر بقية المشهد.
const SLAP=69.1,TURN=75,WALK=76.6,PUNCHLINE=86;
// المسافة بينهم عبر المشهد: يقتربون مشيًا، يقفون وجهًا لوجه، ثم يتراجعون خطوة مع ظهور الستاندات.
function stance(t){
 if(t<31)return [-2,3.2];
 if(t<39)return [mix(-2,-.12,ease((t-31)/8)),mix(3.2,.83,ease((t-31)/8))];
 if(t<42)return [-.12,.83];
 if(t<45)return [mix(-.12,-.58,ease((t-42)/3)),mix(.83,1.42,ease((t-42)/3))];
 return [-.58,1.42];
}
function duel(g,t,dt){
 const c=g.cinemaProps,b=c.beso,m=c.marzooq;b.visible=t>=10;m.visible=t>=5;
 const [bz,mz]=stance(t);b.position.set(0,0,bz);m.position.set(0,0,mz);b.rotation.set(0,Math.PI,0);m.rotation.set(0,0,0);
 if(t>=5&&t<10)m.position.z=mix(4.2,3.2,ease((t-5)/3));
 // مرزوق يقترب خطوة أخيرة واثقة، ثم الجلدة تقذفه ويلف حول نفسه وينبطح على وجهه.
 if(t>=64&&t<SLAP)m.position.z=mix(1.42,.95,ease((t-64)/5));
 else if(t>=SLAP){const after=t-SLAP,fly=ease(Math.min(1,after/1.9));
  m.position.z=.95+fly*2.55;m.rotation.y=fly*Math.PI*2.35;m.position.y=Math.sin(Math.min(1,after/1.5)*Math.PI)*.36;
  if(after>1.9)m.rotation.x=-ease(Math.min(1,(after-1.9)/1.1))*Math.PI/2;}
 // بعدها بيسو يستدير ويمشي بعيد — بدون ما يلتفت ولا مرة.
 if(t>=TURN)b.rotation.y=mix(Math.PI,Math.PI*2,ease((t-TURN)/1.6));
 if(t>=WALK)b.position.z=-.58-ease(Math.min(1,(t-WALK)/8))*7.1;
 pose(b,t>=31&&t<39?'walk':t>=39&&t<45?'faceoff':t>=47&&t<67.4?'guard':t<SLAP?'wind':t<TURN?'slap':t<WALK?'cap':t<PUNCHLINE?'walk':'cap',t,dt);
 pose(m,((t>=5&&t<10)||(t>=31&&t<39))?'walk':(t>=39&&t<45)?'faceoff':t<SLAP?'challenge':t<SLAP+3.9?'recoil':'plead',t,dt);
 if(t<5){camera(g,[.08,1.65,4.6-t*.72],[0,1.55,-9],66);if(c.doorHinge)c.doorHinge.rotation.y=-ease(t/2)*1.5;g.cinemaCaption='خارج الباب / خطوات خلف بيسو';}
 else if(t<10){const angle=ease(clamp((t-5)/1.4))*Math.PI;camera(g,[0,1.65,.65],[Math.sin(angle)*2.2,1.62,.65-Math.cos(angle)*5],62);g.cinemaCaption='مرزوق خرج خلفه';}
 else if(t<17){camera(g,[.78,1.72,1.0],[0,1.7,3.2],36);g.cinemaGraphic='ゴゴゴ';g.cinemaCaption='مرزوق';}
 else if(t<24){camera(g,[-.78,1.7,.2],[0,1.72,-2],37);g.cinemaCaption='بيسو';}
 else if(t<31){camera(g,[1.15,1.65,-.1],[0,1.65,3.2],41);g.cinemaCaption='سر الممرات';}
 // المشية المتقابلة: لقطة جانبية منخفضة تجمع الاثنين وهم يقصّرون المسافة خطوة بخطوة.
 else if(t<39){const close=ease((t-31)/8);camera(g,[mix(7.1,5.2,close),mix(2.45,1.42,close),mix(1.35,.42,close)],[0,mix(1.10,1.55,close),.36],mix(51,44,close));g.cinemaGraphic='ゴゴゴ';g.cinemaCaption='بيسو × مرزوق · كل واحد يقرّب خطوة';}
 // الوقفة وجهًا لوجه: عدسة ٢٠° قريبة تملأ الكادر بالوجهين، مع ميل بسيط ودفعة بطيئة للأمام.
 // عدسة ٢٠° تعطي شريطًا رأسيًا ضيقًا، والميلة تنزّل الرؤوس لـ١٫٧٠م — فالتصويب على ١٫٧٩ لا على مستوى العين الواقف.
 else if(t<42){const push=ease((t-39)/3);camera(g,[mix(2.25,1.95,push),1.80,.355],[0,1.785,.355],20);g.camera.rotation.z=.05+push*.035;g.cinemaGraphic='ゴゴゴゴゴゴ';g.cinemaCaption='وجهًا لوجه · ما أحد رجع خطوة';}
 // لقطة من فوق كتف بيسو: لازم الكاميرا تتراجع خلف رأسه، لا تقف على بعد ٩٠سم منه.
 else if(t<47){camera(g,[1.25,1.82,-1.35],[0,1.72,1.42],38);g.cinemaGraphic='THE WORLD';g.cinemaCaption='الزمن يتوقف';g.cinemaFx='time-stop';}
 // z=1.15 كان يحط الكاميرا على بُعد ٢٧سم من مرزوق — عمليًا داخل جسمه. تراجعنا للخلف وللجنب.
 else if(t<52){camera(g,[-1.78,1.72,.58],[0,1.68,-.58],39);g.cinemaGraphic='STAR BESO';g.cinemaFx='time-stop';}
 else if(t<64){camera(g,[4.35,1.72,.55],[0,1.24,.36],51);g.cinemaCaption='اختبار القوة';g.cinemaGraphic=t<58?'MUDA MUDA':'ORA ORA';if(!g.settings.reduced){g.camera.position.y+=Math.sin(t*77)*.025;g.camera.rotation.z=Math.sin(t*57)*.012;}if(t>=62&&t<62.5)g.cinemaFx='impact';}
 else if(t<67.4){camera(g,[2.95,1.80,.15],[0,1.65,.52],46);g.cinemaGraphic='ゴゴゴゴ';g.cinemaCaption='خطوة أخيرة واثقة';}
 // لقطة جانبية للاثنين: لازم الذراع المسحوبة ورأس مرزوق يبينان في نفس الكادر.
 else if(t<SLAP){camera(g,[2.95,1.76,.12],[0,1.62,.2],42);g.cinemaGraphic='ゴゴゴゴゴ';g.cinemaCaption='بيسو رفع يده';g.cinemaFx='time-stop';}
 else if(t<SLAP+.8){camera(g,[2.45,1.70,.42],[0,1.58,.32],38);g.cinemaGraphic='パシィン';g.cinemaCard='جلدة واحدة';g.cinemaCaption='بيسو ما رد بالكلام';g.cinemaFx='slap';if(!g.settings.reduced){g.camera.position.x+=Math.sin(t*151)*.07;g.camera.position.y+=Math.cos(t*133)*.055;g.camera.rotation.z=Math.sin(t*109)*.055;}}
 else if(t<TURN){camera(g,[4.7,1.95,1.9],[0,1.05,2.4],52);g.cinemaGraphic='ゴゴゴ';g.cinemaCaption='مرزوق طار';if(t<SLAP+1.3)g.cinemaFx='impact';}
 else if(t<PUNCHLINE){camera(g,[.32,1.50,b.position.z-3.3],[0,1.44,b.position.z],42);g.cinemaFx='aura';g.cinemaGraphic='ゴゴゴゴゴ';g.cinemaCaption='ومشى بيسو · ولا التفت';}
 else{camera(g,[1.55,.44,5.1],[0,.34,2.8],56);g.cinemaFx='sepia';g.cinemaCard=t<90?'وصّلني البيت':'TO BE CONTINUED';g.cinemaCaption='مرزوق على الأرض · ندم مؤقت';}
 c.star.visible=t>=46&&t<SLAP+1.2;c.world.visible=t>=46&&t<SLAP+.2;c.star.position.set(.55,0,b.position.z+.35);c.star.rotation.y=Math.PI;c.world.position.set(-.55,0,m.position.z-.35);c.world.rotation.y=0;
 pose(c.star,t>=SLAP?'slap':t>=67.4?'wind':t>=52&&t<64?'punch':'guard',t,dt);pose(c.world,t>=52&&t<62?'punch':'recoil',t+.1,dt);
 // الأورا: أسطوانة ذهبية شفافة حول بيسو + حلقات تصعد لفوق أثناء المشية الأخيرة.
 // تخفت مع بداية الإغلاق الكوميدي: بيسو صار بعيد والنكتة ما تحتاج توهجًا ذهبيًا فوقها.
 const aura=t>=TURN?clamp((t-TURN)/2.2)*(t>=PUNCHLINE?clamp(1-(t-PUNCHLINE)/2.5):1):0;
 if(c.aura){c.aura.visible=aura>0;c.aura.material.opacity=aura*.3;c.aura.position.set(b.position.x,1.45+Math.sin(t*4)*.05,b.position.z);c.aura.rotation.y=t*1.6;c.aura.scale.set(1+Math.sin(t*6)*.06,1,1+Math.cos(t*6)*.06);}
 for(let i=0;i<3;i++){const ring=c.rings[i],rise=(t*1.5+i*.33)%1;
  if(aura>0){ring.material.color.setHex(0xffd070);ring.material.opacity=aura*.6*(1-rise);ring.position.set(b.position.x,.3+rise*2.5,b.position.z);ring.scale.setScalar(.9+rise*.8);ring.rotation.set(Math.PI/2,0,0);}
  else{ring.material.opacity=t>=42&&t<64?.5:0;ring.position.set(0,1.3,.3);ring.scale.setScalar(.6+((t*(t<52?.8:2)+i*.33)%1)*2.8);ring.lookAt(g.camera.position);}}
 const stepping=(t>=5&&t<10)||(t>=31&&t<39)||(t>=WALK&&t<PUNCHLINE);
 if(stepping&&Math.floor(t*1.7)!==g.cinemaStep){g.cinemaStep=Math.floor(t*1.7);g.sounds.step(t>=WALK?b.position:m.position,t<WALK);}
 if(t>=52&&t<64&&Math.floor(t*9)!==g.cinemaHit){g.cinemaHit=Math.floor(t*9);g.sounds.impact(t<58?'gold':'violet',g.settings.reduced);}
 if(t>=SLAP&&!c.slapped){c.slapped=true;g.sounds.timeStop();g.sounds.impact('gold',g.settings.reduced);g.sounds.scare(g.settings.reduced);}
}
// نفس الإخراج اللي اشتغل، بس الكاميرا صارت تزحف بدل ما تجمد: دوران بطيء حول الطاولة ثم
// دفعتان للأمام على كل وجه. الإيقاع هو نفسه والقطعات في نفس التوقيتات.
function cafe(g,t,dt){
 const c=g.cinemaProps;pose(c.beso,t<16?'guard':t<27?'recoil':'challenge',t,dt);pose(c.marzooq,t<21?'challenge':'jojo',t,dt);
 if(t<10){const a=ease(t/10)*.5;camera(g,[Math.cos(.62+a)*6.2,mix(2.25,1.92,ease(t/10)),Math.sin(.62+a)*6.2],[0,1.18,0],mix(50,45,ease(t/10)));g.cinemaCaption='غرفة المصالحة';}
 else if(t<16){const d=ease((t-10)/6);camera(g,[mix(-2.9,-2.2,d),1.72,mix(2.95,2.35,d)],[1.15,1.55,0],mix(45,37,d));g.cinemaCaption='ماء اللوز';}
 else if(t<21){const d=ease((t-16)/5);camera(g,[mix(1.45,1.05,d),1.62,mix(2.2,1.75,d)],[-1.25,1.58,0],mix(42,34,d));g.cinemaGraphic='ゴゴゴ';g.cinemaCaption='غالبًا...';}
 else if(t<27){camera(g,[3.7,2.2,4],[0,1.2,0],49);g.cinemaFx='time-stop';g.cinemaCaption='الغرفة ترجع';if(c.bed)c.bed.visible=true;if(c.roomDoor)c.roomDoor.visible=true;c.light.intensity=mix(24,2,ease((t-21)/6));}
 else if(t<31){camera(g,[-.52,1.32,1.78],[-1.2,1.45,0],36);g.cinemaFx='sepia';g.cinemaCaption='بيسو يفيق من جديد';}
 else{camera(g,[0,.85,1.8],[0,1.45,-2.5],58);g.cinemaFx='sepia';g.cinemaCard='هل خرج أصلًا؟';g.cinemaCaption='الباب مقفّل من جديد';}
}
// الاعتراف: الكاميرا تتحرك ببطء طول المشهد بدل القطعات الثابتة، والضوء يخفت مع ثقل الكلام
// ثم يدفأ لما يمد بيسو يده. الحركة نفسها هي اللي تحمل المشهد، لأنه مشهد كلام لا قتال.
function timeLoop(g,t,dt){
 const c=g.cinemaProps;c.beso.visible=c.marzooq.visible=true;
 c.beso.position.set(-.9,0,-5.2);c.marzooq.position.set(.65,0,-8.2);
 pose(c.beso,t<31?'guard':t<40?'faceoff':'jojo',t,dt);pose(c.marzooq,t<36?'confess':t<40?'challenge':'jojo',t,dt);
 if(t<12){const d=ease(t/12);camera(g,[mix(3.1,2.35,d),mix(1.90,1.68,d),mix(-3.2,-5.0,d)],[.65,1.58,-8.2],mix(47,40,d));g.cinemaCaption='مرزوق عند الباب الحقيقي';}
 // الزحف يقف على ٢٫٢م لا على ٠٫٩م: أقرب من كذا والكاميرا تدخل جوّا الممثل.
 else if(t<26){const d=ease((t-12)/14);camera(g,[mix(-2.5,-1.55,d),1.66,mix(-6.3,-6.85,d)],[.65,mix(1.56,1.62,d),-8.2],mix(44,36,d));g.cinemaCaption='اعتراف مرزوق';c.light.intensity=mix(11,4.5,d);}
 else if(t<36){const d=ease((t-26)/10);camera(g,[mix(1.95,1.6,d),1.63,mix(-7.0,-6.45,d)],[-.9,1.58,-5.2],mix(42,35,d));g.cinemaCaption='بيسو يسمع للنهاية';c.light.intensity=4.5;}
 else if(t<40){const d=ease((t-36)/4);camera(g,[mix(1.95,1.62,d),mix(1.64,1.60,d),mix(-6.75,-7.0,d)],[.65,1.60,-8.2],mix(36,30,d));g.cinemaFx='sepia';g.cinemaCaption='مرزوق · وجه بلا أعذار';}
 else{const reach=ease((t-40)/3.2);c.beso.position.x=mix(-.9,.42,reach);c.beso.position.z=mix(-5.2,-6.7,reach);
  camera(g,[mix(3.35,2.55,reach),mix(2.05,1.52,reach),mix(-5.2,-6.9,reach)],[.2,mix(1.40,1.55,reach),-7.4],mix(50,38,reach));
  c.light.intensity=mix(4.5,13,reach);g.cinemaFx='sepia';g.cinemaCard='أنت شخص رهيب';g.cinemaCaption='بيسو مد يده لمرزوق';}
}
// غرفة المراقبة: كانت تُلعب في الشارع رغم إن كل كلامها عن شاشات وتسجيلات. صارت في غرفتها،
// والمشهد ينتهي بالاثنين واقفين أمام باب معدني ينفتح عليهم.
function partner(g,t,dt){
 const c=g.cinemaProps;
 pose(c.beso,t<20?'guard':t<31?'faceoff':'walk',t,dt);pose(c.marzooq,t<20?'recoil':t<31?'challenge':'walk',t,dt);
 c.entity.visible=t<8;c.entity.position.z=5.2+Math.sin(t*.5)*.18;
 if(c.doorHinge&&t>=35)c.doorHinge.rotation.y=-ease((t-35)/3)*1.15;
 // من خلف كتفيهما نحو الشاشات: الزحف السابق كان ينتهي عند z=.15 — بين الممثلين تمامًا.
 if(t<5){const d=ease(t/5);camera(g,[.05,mix(1.90,1.72,d),mix(4.1,2.8,d)],[0,1.32,-2.7],mix(62,54,d));g.cinemaCaption='التسجيل الأخير';g.cinemaGraphic='REC 017';}
 // زحف للأمام من خلف الاثنين باتجاه الباب: الكادر السابق كان واقفًا عند الباب ويطالع
 // الجدار الفاضي، والممثلان خلف الكاميرا تمامًا.
 else if(t<15){const d=ease((t-5)/10);camera(g,[mix(.45,.15,d),mix(1.98,1.82,d),mix(-4.3,-2.5,d)],[0,mix(1.52,1.44,d),mix(1.8,4.4,d)],mix(52,46,d));g.cinemaCaption='الكيان خلف الباب';}
 else if(t<25){const d=ease((t-15)/10);camera(g,[mix(.75,.5,d),1.70,mix(2.3,1.9,d)],[-.8,1.66,0],mix(42,34,d));g.cinemaCaption='الحقيقة بلا أقفال';}
 else if(t<31){const d=ease((t-25)/6);camera(g,[mix(-.65,-.42,d),1.70,mix(2.2,1.85,d)],[.9,1.66,-.4],mix(42,33,d));g.cinemaCaption='قرار مرزوق';}
 else{const walk=ease((t-31)/5);c.beso.position.z=mix(0,3.0,walk);c.marzooq.position.z=mix(-.4,2.85,walk);
  camera(g,[mix(4.3,3.2,walk),mix(2.1,1.78,walk),mix(1.0,2.6,walk)],[0,1.42,mix(2.0,4.5,walk)],mix(50,44,walk));
  g.cinemaFx=t>=35?'impact':'sepia';g.cinemaCard=t>=35?'طَقّ... طَقّ...':'';g.cinemaCaption='شيء ينتظر في الجهة الأخرى';}
}
export function updateCinema(g,dt){
 const t=g.cinemaTime+=dt,id=g.cinemaId,story=STORY[id];g.cinemaFx='';g.cinemaGraphic='';g.cinemaCard='';
 const beat=story.beats.findLastIndex(([time])=>t>=time);
 if(beat!==g.cinemaBeat){g.cinemaBeat=beat;const [,speaker,line]=story.beats[beat];const next=story.beats[beat+1]?.[0]??story.duration;g.say(`${speaker}: «${line}»`,next-t+.05);g.sounds.voice(`jojo-${id}-${beat}`);}
 if(id==='truth')duel(g,t,dt);else if(id==='comedy')cafe(g,t,dt);else if(id==='loop')timeLoop(g,t,dt);else partner(g,t,dt);
 if(g.cinemaFx==='time-stop'&&g.lastCinemaFx!=='time-stop')g.sounds.timeStop();g.lastCinemaFx=g.cinemaFx;const frozen=g.cinemaFx==='time-stop';if(!frozen)g.cinemaProps.dust.rotation.y+=dt*.09;
 g.sounds.listener(g.camera.position,g.camera.rotation.y,g.camera.rotation.x);
 if(t>=story.duration)g.finishCinema();
}
