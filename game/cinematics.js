import * as THREE from 'three';
const beats={
 truth:[[0,'بيسو: «الرسالة والتسجيل معي. هالمرة الباب ما يضحك علي.»'],[4,'مرزوق: «بيسو، لا تخليني هنا!»'],[8,'بيسو: «الحماية الحين عند الجهات المختصة يا خوي.»']],
 comedy:[[0,'مرزوق: «ثلاثة... اثنين... مفاجأة!»'],[4,'بيسو: «تحتفل بميلادي ولا تسوي لي جنازة تدريبية؟»'],[9,'مرزوق: «باقي الحساب. تدفع كاش ولا صداقة؟»']],
 loop:[[0,'بيسو: «وأخيرًا... غرفتي.»'],[4,'بيسو: «لحظة. نفس الكوب؟ نفس السرير؟»'],[8,'مرزوق: «لا تطلع يا بيسو... المحاولة ثمانية عشر.»']],
 secret:[[0,'النظام: «تم التعرّف على مدير التجربة: بيسو.»'],[4,'مرزوق: «أنت اللي طلبت مني أمسح ذاكرتك كل مرة.»'],[9,'بيسو: «يعني حتى أنا... ما أقدر أثق فيني؟»']]
};
export function beginCinema(g,id){
 g.marzooq.userData.skull.rotation.set(0,0,0);
 g.clearWorld();g.level='cinema';g.cinemaTime=0;g.cinemaBeat=-1;g.cinemaId=id;g.torch.intensity=0;g.hand.visible=false;g.threat=0;g.fill.intensity=.9;g.scene.fog.color.setHex(id==='truth'?0xb9c9c3:0x090b0a);g.scene.fog.density=id==='truth'?.009:.025;g.marzooq.rotation.set(0,Math.PI,0);g.marzooq.position.set(0,0,-2);g.marzooq.visible=id!=='truth';
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82});
 const floor=mat(id==='comedy'?0x796455:id==='truth'?0x72877b:0x343830);
 g.mesh(22,.2,35,floor,0,-.1,-8);g.cinemaProps={};
 const lamp=new THREE.PointLight(id==='comedy'?0xffd394:id==='secret'?0x8888ff:0xddebd7,45,22);lamp.position.set(0,4,0);g.world.add(lamp);g.cinemaProps.light=lamp;
 const label=(text,x,y,z,w=3)=>{const s=g.sign(text,w,.48,'#17211a','#d9e6c7');s.position.set(x,y,z);g.world.add(s);return s;};
 const prop=(name,h,x,z)=>{const m=g.assets.model(name,h);if(m){m.position.set(x,0,z);g.world.add(m);}return m;};
 if(id==='truth'){
  g.scene.background=new THREE.Color(0xaec5c7);g.fill.color.setHex(0xd5eeff);g.mesh(8,4,.25,mat(0x575d4b),-5,2,0);g.mesh(8,4,.25,mat(0x575d4b),5,2,0);
  label('خارج الممرات · 06:17',0,3.2,-1,3.4);const sun=new THREE.DirectionalLight(0xffe9bc,3);sun.position.set(4,8,-14);g.world.add(sun);
  for(let i=0;i<9;i++){g.mesh(.4,4,.4,mat(0x444f43),-5,2,-i*3);g.mesh(2.6,2.6,2.6,mat(0x536d56),-5,5,-i*3);g.mesh(.15,.03,2,mat(0xc9c8a4),1,.03,-i*4);}
  g.cinemaProps.door=prop('door',2.8,0,.3);
 }else{
  g.scene.background=new THREE.Color(0x090b0a);g.mesh(12,4,.2,mat(id==='comedy'?0x5b5550:0x414638),0,2,-5);g.mesh(.2,4,14,mat(0x454839),-6,2,0);g.mesh(.2,4,14,mat(0x454839),6,2,0);
  if(id==='comedy'){
   label('آسفين على المنوّم',0,3.05,-4.8,4);g.mesh(2,.15,1.3,mat(0x87654c),0,.85,-.5);
   const cake=new THREE.Mesh(new THREE.CylinderGeometry(.42,.43,.3,32),mat(0xe9c19d));cake.position.set(0,1.1,-.5);g.world.add(cake);
   for(let i=0;i<5;i++)g.mesh(.025,.17,.025,mat(0xffbb55),-.2+i*.1,1.33,-.5);
   g.cinemaProps.balloons=[];
   for(let i=0;i<14;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.19,12,12),mat([0xc88981,0xd4bd67,0x7fbb9c,0x889cd1][i%4]));b.scale.y=1.28;b.position.set(Math.sin(i*8)*4,1.8+(i%4)*.27,-3-Math.cos(i)*.7);g.world.add(b);g.cinemaProps.balloons.push(b);}
   prop('almond',.22,1.1,-.5);
  }else if(id==='loop'){
   g.mesh(2,.35,2.8,mat(0x4d4e42),-2,.45,-1.2);g.mesh(1.8,.12,.65,mat(0x969684),-2,.71,-2.1);prop('nightstand',1.15,2,-1.6);label('المحاولة ١٨',0,2.8,-4.8);g.marzooq.position.z=-4;
  }else{
   g.mesh(7,.2,1.2,mat(0x222a2b),0,.8,-2.4);
   for(let i=0;i<7;i++){g.mesh(.84,.65,.12,mat(0x0e1217),-3+i,1.5,-2.5);const m=g.sign(i===3?'المدير: بيسو':`تجربة ٠${11+i}`,.73,.42,'#112a34','#91dcdd');m.position.set(-3+i,1.51,-2.42);g.world.add(m);}
   label('تجربة الصداقة / إعادة الذاكرة',0,3,-4.8,4);g.marzooq.position.set(2.3,0,-.9);g.marzooq.rotation.y=Math.PI*.7;
  }
 }
 g.sounds.stopVoice();g.sounds.cinematic(id);g.changeMode('cinematic');
}
export function updateCinema(g,dt){
 const t=g.cinemaTime+=dt,id=g.cinemaId;const b=beats[id].findLastIndex(([time])=>t>=time);
 if(b!==g.cinemaBeat){g.cinemaBeat=b;g.say(beats[id][b][1],4.8);g.sounds.voice(`${id}-${b}`);}
 const p=g.camera.position;g.camera.rotation.z=0;
 if(id==='truth'){p.set(.35,1.65,3-t*.82);g.camera.lookAt(0,1.6,-22);if(g.cinemaProps.door)g.cinemaProps.door.rotation.y=-Math.min(1,t/2)*1.5;}
 if(id==='comedy'){p.set(Math.sin(t*.15)*.7,1.55,3.3-Math.min(t,8)*.12);g.camera.lookAt(0,1.45,-1.4);g.marzooq.position.x=Math.sin(t*2)*.22;g.marzooq.rotation.z=Math.sin(t*4)*.055;g.cinemaProps.balloons.forEach((o,i)=>o.position.y+=Math.sin(t+i)*dt*.06);}
 if(id==='loop'){p.set(.2,1.62-Math.max(0,t-5)*.07,2.6-Math.min(5,t)*.24);g.camera.lookAt(t<5?-1.5:0,1.2,-2.3);g.cinemaProps.light.intensity=t>7?Math.max(.4,30-(t-7)*9):22;g.marzooq.position.z=-4+Math.max(0,t-8)*.7;}
 if(id==='secret'){p.set(Math.sin(t*.13)*1.2,1.65,3-t*.22);g.camera.lookAt(t>7?2.2:0,1.5,-2.4);g.cinemaProps.light.intensity=22+Math.sin(t*2)*4;}
 g.sounds.listener(p,g.camera.rotation.y,g.camera.rotation.x);
 if(t>=14)g.finishCinema();
}
