import {assetURL} from './assets.js';
import {ROOM_VOICES,MAZE_VOICES} from './voice-lines.js';
export class Soundscape {
 constructor(){this.ctx=null;this.muted=false;this.voices=new Set();this.level='room';this.clock=0;this.ambientClock=0;this.breathClock=0;this.effects=new Set();this.audioEffects=new Set();this.samples=new Map();this.volume=.8;this.preloadRoom();}
 releaseSamples(){for(const a of this.samples.values()){if(this.voices.has(a)||this.audioEffects.has(a))continue;a.pause?.();a.removeAttribute?.('src');a.load?.();}this.samples.clear();}
 preloadNames(names){for(const name of names){if(this.samples.has(name))continue;const a=new Audio(assetURL(`/audio/${name}.mp3`));a.preload='auto';a.load?.();this.samples.set(name,a);}}
 preloadRoom(){this.releaseSamples();this.preloadNames(ROOM_VOICES);}
 preloadMaze(){this.releaseSamples();this.preloadNames([...MAZE_VOICES,'sfx-bat','sfx-mouse','sfx-blackout','sfx-power','sfx-locker','sfx-jumpscare']);}
 preloadEnding(id){this.releaseSamples();const count={truth:12,comedy:7,loop:8,secret:8}[id]||0;this.preloadNames([`ending-${id}`,...Array.from({length:count},(_,i)=>`jojo-${id}-${i}`)]);}
 file(name,volume=.7,voice=false){if(this.paused)return false;let original=this.samples.get(name);if(!original){original=new Audio(assetURL(`/audio/${name}.mp3`));original.preload='auto';this.samples.set(name,original);}const busy=this.voices.has(original)||this.audioEffects.has(original),a=busy&&original.cloneNode?original.cloneNode():original;a.currentTime=0;a.volume=volume*this.volume;a.muted=this.muted;const set=voice?this.voices:this.audioEffects;set.add(a);a.onended=a.onerror=()=>set.delete(a);a.play().catch(()=>set.delete(a));return true;}
 init(){
  if(this.ctx){void this.ctx.resume();return;}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=this.ctx=new AC();this.master=c.createGain();this.master.gain.value=.52;this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-15;this.compressor.ratio.value=5;this.master.connect(this.compressor);this.compressor.connect(c.destination);
  this.hum=c.createGain();this.hum.gain.value=.015;this.hum.connect(this.master);
  for(const hz of [50,100,151]){const o=c.createOscillator();o.type='sine';o.frequency.value=hz;o.connect(this.hum);o.start();}
  this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.7;
  void this.ctx.resume();this.setMuted(this.muted);
 }
 setMuted(v){this.muted=v;if(this.master)this.master.gain.setTargetAtTime(v?0:.52*this.volume,this.ctx.currentTime,.08);for(const a of [...this.voices,...this.audioEffects])a.muted=v;for(const a of this.voices)a.volume=.8*this.volume;}
 pause(v){this.paused=v;if(!this.ctx)return;if(v){void this.ctx.suspend();for(const a of this.voices)a.pause();}else{void this.ctx.resume();for(const a of this.voices)a.play().catch(()=>{});}}
 tone(freq=120,duration=.1,volume=.15,type='sine'){if(!this.ctx)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq*.55),c.currentTime+duration);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+duration);}
 noiseBurst(duration=.1,volume=.1,frequency=700,position){if(!this.ctx)return;const c=this.ctx,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noise;f.type='lowpass';f.frequency.value=frequency;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);n.connect(f);f.connect(g);
  if(position){const p=c.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=1.8;p.maxDistance=28;p.rolloffFactor=1.2;p.positionX.value=position.x;p.positionY.value=.15;p.positionZ.value=position.z;g.connect(p);p.connect(this.master);}else g.connect(this.master);n.start();n.stop(c.currentTime+duration);
 }
 step(pos,enemy=false,occluded=false){this.noiseBurst(enemy?.21:.12,enemy?(occluded?.18:.48):.07,enemy?(occluded?180:540):700,pos);}
 click(){this.noiseBurst(.05,.09,2400);}
 door(){this.tone(72,.8,.2,'sawtooth');this.noiseBurst(.5,.35,400);}
 pickup(){this.tone(620,.13,.09);setTimeout(()=>this.tone(820,.15,.07),90);}
 scare(reduced){this.file('sfx-jumpscare',reduced?.28:.72);this.noiseBurst(reduced?.18:.34,reduced?.10:.24,1900);this.tone(83,.6,reduced?.08:.2,'sawtooth');}
 blackout(){this.file('sfx-blackout',.68);this.noiseBurst(.5,.14,180);this.tone(48,.8,.09,'sawtooth');}
 powerRestore(){this.file('sfx-power',.66);this.tone(88,.22,.05,'square');this.noiseBurst(.18,.04,1600);}
 creature(kind){this.file(kind==='bat'?'sfx-bat':'sfx-mouse',.72);if(kind==='bat')this.noiseBurst(.26,.14,3200);else this.noiseBurst(.20,.10,2100);}
 vending(){this.tone(180,.12,.06,'square');setTimeout(()=>this.tone(132,.18,.08,'square'),130);setTimeout(()=>this.noiseBurst(.22,.18,540),300);}
 locker(){this.file('sfx-locker',.68);this.tone(92,.5,.05,'sawtooth');this.noiseBurst(.25,.08,1200);}
 event(id){if(id==='blackout')return this.blackout();if(id==='cctv'){this.noiseBurst(.55,.18,2400);this.tone(64,.9,.08,'square');}else if(id==='false-exit'){this.door();setTimeout(()=>this.tone(230,.5,.06,'triangle'),350);}else if(id==='lounge'){this.tone(220,.35,.04);this.tone(277,.5,.03);}}
 voice(name){if(this.paused)return;this.stopVoice();this.file(name,.8,true);}
 stopVoice(){for(const a of this.voices){a.pause();a.currentTime=0;}this.voices.clear();}
 listener(pos,yaw,pitch=0){if(!this.ctx)return;const l=this.ctx.listener;if(l.positionX){l.positionX.value=pos.x;l.positionY.value=pos.y;l.positionZ.value=pos.z;l.forwardX.value=-Math.sin(yaw)*Math.cos(pitch);l.forwardY.value=Math.sin(pitch);l.forwardZ.value=-Math.cos(yaw)*Math.cos(pitch);l.upX.value=0;l.upY.value=1;l.upZ.value=0;}}
 setVolume(v){this.volume=Math.max(0,Math.min(1,v));this.setMuted(this.muted);}
 note(freq,duration,volume,delay=0,type='sine'){
  if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);this.effects.add(o);o.onended=()=>{this.effects.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
 }
 stopEffects(){for(const o of this.effects){try{o.stop();}catch{}}this.effects.clear();}
 cinematic(id){
  this.stopEffects();this.hum?.gain.setTargetAtTime(.003,this.ctx?.currentTime||0,.2);
  const bass=id==='truth'?[73.4,73.4,87.3,65.4]:id==='comedy'?[98,123.5,146.8,110]:id==='secret'?[82.4,110,123.5,164.8]:[55,58.3,55,51.9];
  for(let i=0;i<(id==='truth'?88:44);i++){const delay=i*.5;this.note(bass[i%4],.38,.026,delay,'triangle');if(i%4===0)this.note(bass[i%4]*2,.85,.017,delay,'sine');}
 }
 timeStop(){this.tone(520,.65,.09,'sawtooth');this.note(55,1.3,.09);this.noiseBurst(.35,.12,2100);}
 impact(color,reduced=false){this.noiseBurst(.10,reduced?.055:.12,850);this.tone(color==='gold'?100:145,.12,reduced?.025:.06,'triangle');}
 update(dt,threat,stage,sprinting=false,pos={x:0,z:0}){
  if(!this.ctx)return;this.hum.gain.setTargetAtTime(stage==='maze'?.028:.008,this.ctx.currentTime,.3);this.clock+=dt;this.breathClock+=dt;this.ambientClock+=dt;
  if(threat>.42&&this.clock>.55+(1-threat)*.75){this.tone(46,.12,.03+threat*.055);this.note(52,.1,.03,.15);this.clock=0;}
  if((sprinting||threat>.7)&&this.breathClock>(sprinting?.6:1.1)){this.noiseBurst(.33,sprinting?.075:.045,950);this.breathClock=0;}
  if(this.ambientClock>9+Math.random()*5){this.ambientClock=0;const a=Math.random()*Math.PI*2,p={x:pos.x+Math.cos(a)*7,z:pos.z+Math.sin(a)*7};if(stage==='maze'){this.noiseBurst(.8,.17,1700,p);this.noiseBurst(.12,.22,280,p);}else this.noiseBurst(.7,.08,260,p);}
 }
 dispose(){this.stopVoice();this.stopEffects();for(const a of this.audioEffects)a.pause();this.audioEffects.clear();this.samples.clear();void this.ctx?.close();}
}
