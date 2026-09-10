import * as THREE from 'three';
import STORY from './cinema-story.json';
import {actor,pose} from './cinema-actors.js';

const mix=THREE.MathUtils.lerp;
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
function camera(g,position,target,fov=48){g.camera.position.set(...position);g.camera.lookAt(...target);if(g.camera.fov!==fov){g.camera.fov=fov;g.camera.updateProjectionMatrix();}}
function sign(g,text,x,y,z,width=3,bg='#17211f',fg='#f4df9d'){const s=g.sign(text,width,.45,bg,fg);s.position.set(x,y,z);g.world.add(s);return s;}
function prop(g,name,height,x,y,z){const o=g.assets.model(name,height);if(o){o.position.set(x,y,z);g.world.add(o);}return o;}
function street(g){
 g.scene.background=new THREE.Color(0x302647);g.scene.fog.color.setHex(0x44344a);g.scene.fog.density=.013;
 g.mesh(17,.2,38,mat(0x756877),0,-.12,0);
 for(const side of [-1,1]){
  g.mesh(1.6,.13,38,mat(0xb09b88),side*6.2,.02,0);
  for(let i=0;i<6;i++){
   const z=-14+i*6,height=5+(i%3)*.7;
   g.mesh(3.4,height,5.5,mat([0x916b59,0xb5987d,0x7b7272][i%3]),side*8,height/2,z);
   for(let row=0;row<3;row++)for(let n=0;n<2;n++){
    g.mesh(.07,.9,.8,mat(0x28333c),side*6.26,1.2+row*1.35,z-1.4+n*2);
    g.mesh(.12,.08,1,mat(0xcdb08d),side*6.18,.73+row*1.35,z-1.4+n*2);
   }
  }
  for(const z of [-7,6]){g.mesh(.06,3.5,.06,mat(0x252933),side*5.6,1.75,z);g.mesh(.42,.12,.3,mat(0xffde9f,{emissive:0xffb650,emissiveIntensity:2}),side*5.6,3.5,z);}
 }
 for(let z=-16;z<18;z+=3)g.mesh(.07,.012,1.1,mat(0xd0bc8f),0,.015,z);
 const rim=new THREE.DirectionalLight(0xae95ff,2.5);rim.position.set(-4,5,3);g.world.add(rim);
 const sun=new THREE.DirectionalLight(0xffcb91,2.5);sun.position.set(3,5,-2);g.world.add(sun);
}
function corridor(g){
 g.scene.background=new THREE.Color(0x12170e);g.scene.fog.color.setHex(0x202610);g.scene.fog.density=.028;
 g.mesh(7,.2,30,g.materials.floor,0,-.12,-7);g.mesh(7,.15,30,mat(0x7c7859),0,3.2,-7);
 for(const side of [-1,1])g.mesh(.2,3.3,30,g.materials.wall,side*3.5,1.6,-7);
 for(let i=0;i<7;i++){g.mesh(.42,.05,1.25,mat(0xe8e8b4,{emissive:0xe8e8b4,emissiveIntensity:1}),0,3.1,3-i*4);const l=new THREE.PointLight(0xf2edb7,5,6);l.position.set(0,2.8,3-i*4);g.world.add(l);}
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
 if(id==='loop')corridor(g);else street(g);
 const c=g.cinemaProps;c.beso=actor(g,'beso');c.marzooq=actor(g,'marzooq');c.star=actor(g,'star');c.world=actor(g,'world');c.star.visible=c.world.visible=false;
 c.beso.rotation.y=Math.PI;c.marzooq.rotation.y=0;c.beso.position.set(0,0,-2);c.marzooq.position.set(0,0,3.2);effects(g);
 const key=new THREE.PointLight(id==='loop'?0xe3e6bd:0xffddb0,24,13);key.position.set(1,3,1);g.world.add(key);c.light=key;
 if(id==='truth'){
  g.mesh(4,3.7,.3,mat(0x6a625b),-2.9,1.85,4);g.mesh(4,3.7,.3,mat(0x6a625b),2.9,1.85,4);
  c.door=prop(g,'door',2.8,0,0,4);sign(g,'خارج الممرات',0,3.25,3.82,2.4).rotation.y=Math.PI;c.beso.visible=false;c.marzooq.visible=false;
 }else if(id==='comedy'){
  sign(g,'غرفة المصالحة',0,3,-3.8,4);c.beso.position.set(-1.25,0,0);c.beso.rotation.y=-Math.PI/2;c.marzooq.position.set(1.25,0,0);c.marzooq.rotation.y=Math.PI/2;
  g.mesh(1.4,.12,1.2,mat(0x66432d),0,.85,0);g.mesh(.16,.8,.16,mat(0x392e2b),0,.4,0);
  prop(g,'almond',.2,.3,.92,0);prop(g,'almond',.2,-.3,.92,0);
  c.bed=prop(g,'bed',.75,0,0,-2.4);if(c.bed)c.bed.visible=false;c.roomDoor=prop(g,'door',2.7,0,0,-3.4);if(c.roomDoor)c.roomDoor.visible=false;
 }else if(id==='loop'){
  c.door=prop(g,'door',2.65,0,0,-11.5);sign(g,'الباب الحقيقي',0,2.9,-11.8,1.8);c.beso.position.set(-.9,0,-5.2);c.beso.rotation.y=-.18;c.marzooq.position.set(.65,0,-8.2);c.marzooq.rotation.y=Math.PI+.15;
 }else{
  sign(g,'غرفة المراقبة / تسجيل ٠١٧',0,3.1,-3.8,4.5,'#162021','#b9d1c7');
  g.mesh(4,.12,1,mat(0x252b2c),0,.85,-2.7);for(let i=0;i<3;i++){const mon=prop(g,'monitor',.65,-1.3+i*1.3,.9,-2.7);if(mon)mon.rotation.y=Math.PI;}
  c.door=prop(g,'door',2.75,0,0,3.1);c.beso.position.set(-.8,0,0);c.beso.rotation.y=Math.PI;c.marzooq.position.set(.9,0,-.4);c.marzooq.rotation.y=Math.PI;c.entity=c.world;c.entity.visible=false;c.entity.position.set(0,0,4.2);c.entity.scale.setScalar(1.4);
 }
 g.changeMode('cinematic');
}
function duel(g,t,dt){
 const c=g.cinemaProps,b=c.beso,m=c.marzooq;b.visible=t>=10;m.visible=t>=5;b.position.set(0,0,t<31?-2:mix(-2,-.58,ease((t-31)/11)));m.position.set(0,0,t<31?3.2:mix(3.2,1.42,ease((t-31)/11)));b.rotation.set(0,Math.PI,0);m.rotation.set(0,0,0);
 if(t>=5&&t<10)m.position.z=mix(4.2,3.2,ease((t-5)/3));if(t>=64){m.position.z=1.42+ease((t-64)/5)*2.4;m.rotation.x=-ease((t-64)/5)*.35;}if(t>=64)b.position.z=-.58-Math.min(5,t-64)*.42;
 pose(b,t>=31&&t<42?'walk':t>=47&&t<64?'guard':t>=64?'cap':'challenge',t,dt);pose(m,((t>=5&&t<10)||(t>=31&&t<42))?'walk':t>=64?'recoil':'challenge',t,dt);
 if(t<5){camera(g,[.08,1.65,4.6-t*.72],[0,1.55,-9],66);if(c.door)c.door.rotation.y=-ease(t/2)*1.5;g.cinemaCaption='خارج الباب / خطوات خلف بيسو';}
 else if(t<10){const angle=ease(clamp((t-5)/1.4))*Math.PI;camera(g,[0,1.65,.65],[Math.sin(angle)*2.2,1.62,.65-Math.cos(angle)*5],62);g.cinemaCaption='مرزوق خرج خلفه';}
 else if(t<17){camera(g,[.78,1.72,1.0],[0,1.7,3.2],36);g.cinemaGraphic='ゴゴゴ';g.cinemaCaption='مرزوق';}
 else if(t<24){camera(g,[-.78,1.7,.2],[0,1.72,-2],37);g.cinemaCaption='بيسو';}
 else if(t<31){camera(g,[1.15,1.65,-.1],[0,1.65,3.2],41);g.cinemaCaption='سر الممرات';}
 else if(t<42){camera(g,[6.3,2.25,1.1],[0,1.13,.35],49);g.cinemaGraphic='ゴゴゴ';g.cinemaCaption='بيسو × مرزوق';}
 else if(t<47){camera(g,[.88,1.74,-.05],[0,1.67,1.42],38);g.cinemaGraphic='THE WORLD';g.cinemaCaption='الزمن يتوقف';g.cinemaFx='time-stop';}
 else if(t<52){camera(g,[-.82,1.72,1.15],[0,1.68,-.58],39);g.cinemaGraphic='STAR BESO';g.cinemaFx='time-stop';}
 else if(t<64){camera(g,[4.35,1.72,.55],[0,1.24,.36],51);g.cinemaCaption='اختبار القوة';g.cinemaGraphic=t<58?'MUDA MUDA':'ORA ORA';if(!g.settings.reduced){g.camera.position.y+=Math.sin(t*77)*.025;g.camera.rotation.z=Math.sin(t*57)*.012;}if(t>=62&&t<62.5)g.cinemaFx='impact';}
 else{const middle=(b.position.z+m.position.z)/2;camera(g,[6.9,2.05,middle],[0,1.2,middle],60);g.cinemaFx='sepia';g.cinemaCard='TO BE CONTINUED';g.cinemaCaption='بيسو اختار طريقه.';}
 c.star.visible=c.world.visible=t>=46&&t<66;c.star.position.set(.55,0,b.position.z+.35);c.star.rotation.y=Math.PI;c.world.position.set(-.55,0,m.position.z-.35);c.world.rotation.y=0;
 pose(c.star,t>=52&&t<64?'punch':'guard',t,dt);pose(c.world,t>=52&&t<62?'punch':'recoil',t+.1,dt);
 for(let i=0;i<3;i++){const ring=c.rings[i],active=(t>=42&&t<52)||(t>=52&&t<64);ring.material.opacity=active?.5:0;ring.scale.setScalar(.6+((t*(t<52?.8:2)+i*.33)%1)*2.8);ring.lookAt(g.camera.position);}
 if(((t>=5&&t<10)||(t>=31&&t<42))&&Math.floor(t*1.7)!==g.cinemaStep){g.cinemaStep=Math.floor(t*1.7);g.sounds.step(m.position,true);}
 if(t>=52&&t<64&&Math.floor(t*9)!==g.cinemaHit){g.cinemaHit=Math.floor(t*9);g.sounds.impact(t<58?'gold':'violet',g.settings.reduced);}
}
function cafe(g,t,dt){
 const c=g.cinemaProps;pose(c.beso,t<16?'guard':t<27?'recoil':'challenge',t,dt);pose(c.marzooq,t<21?'challenge':'jojo',t,dt);
 if(t<10){camera(g,[4.4,2.0,4.5],[0,1.15,0],48);g.cinemaCaption='غرفة المصالحة';}
 else if(t<16){camera(g,[-2.65,1.72,2.7],[1.15,1.55,0],42);g.cinemaCaption='ماء اللوز';}
 else if(t<21){camera(g,[1.25,1.62,2.0],[-1.25,1.58,0],39);g.cinemaGraphic='ゴゴゴ';g.cinemaCaption='غالبًا...';}
 else if(t<27){camera(g,[3.7,2.2,4],[0,1.2,0],49);g.cinemaFx='time-stop';g.cinemaCaption='الغرفة ترجع';if(c.bed)c.bed.visible=true;if(c.roomDoor)c.roomDoor.visible=true;c.light.intensity=mix(24,2,ease((t-21)/6));}
 else if(t<31){camera(g,[-.8,1.25,1.25],[-1.2,1.35,0],38);g.cinemaFx='sepia';g.cinemaCaption='بيسو يفيق من جديد';}
 else{camera(g,[0,.85,1.8],[0,1.45,-2.5],58);g.cinemaFx='sepia';g.cinemaCard='هل خرج أصلًا؟';g.cinemaCaption='الباب مقفّل من جديد';}
}
function timeLoop(g,t,dt){
 const c=g.cinemaProps;c.beso.visible=c.marzooq.visible=true;c.beso.position.set(-.9,0,-5.2);c.marzooq.position.set(.65,0,-8.2);pose(c.beso,t<31?'guard':t<40?'challenge':'jojo',t,dt);pose(c.marzooq,t<36?'recoil':t<40?'challenge':'jojo',t,dt);
 if(t<12){camera(g,[2.7,1.75,-4.4],[.65,1.58,-8.2],43);g.cinemaCaption='مرزوق عند الباب الحقيقي';}
 else if(t<26){camera(g,[-2.2,1.65,-7.0],[.65,1.55,-8.2],39);g.cinemaCaption='اعتراف مرزوق';c.light.intensity=10;}
 else if(t<36){camera(g,[1.6,1.62,-6.0],[-.9,1.58,-5.2],39);g.cinemaCaption='بيسو يسمع للنهاية';}
 else if(t<40){camera(g,[1.5,1.62,-7.2],[.65,1.55,-8.2],36);g.cinemaFx='sepia';g.cinemaCaption='مرزوق';}
 else{c.beso.position.x=mix(-.9,.45,ease((t-40)/3));camera(g,[3.6,1.95,-5.5],[0,1.35,-7],49);g.cinemaFx='sepia';g.cinemaCard='أنت شخص رهيب';g.cinemaCaption='بيسو مد يده لمرزوق';}
}
function partner(g,t,dt){
 const c=g.cinemaProps;pose(c.beso,t<20?'guard':t<31?'challenge':'walk',t,dt);pose(c.marzooq,t<20?'recoil':t<31?'challenge':'walk',t,dt);c.entity.visible=t<8;c.entity.position.z=4.2+Math.sin(t*.5)*.15;
 if(t<5){camera(g,[0,1.55,1.6],[0,1.4,-2.7],54);g.cinemaCaption='التسجيل الأخير';g.cinemaGraphic='REC 017';}
 else if(t<15){camera(g,[3.0,1.85,3.7],[0,1.5,-.1],45);g.cinemaCaption='الكيان خلف الباب';}
 else if(t<25){camera(g,[.6,1.7,2.1],[-.8,1.65,0],40);g.cinemaCaption='الحقيقة بلا أقفال';}
 else if(t<31){camera(g,[-.5,1.7,2.0],[.9,1.65,-.4],40);g.cinemaCaption='قرار مرزوق';}
 else{const walk=ease((t-31)/5);c.beso.position.z=mix(0,2.15,walk);c.marzooq.position.z=mix(-.4,2.0,walk);camera(g,[4.0,2.0,4.8],[0,1.3,1.25],48);g.cinemaFx=t>=35?'impact':'sepia';g.cinemaCard=t>=35?'طَقّ... طَقّ...':'';g.cinemaCaption='شيء ينتظر في الجهة الأخرى';}
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
