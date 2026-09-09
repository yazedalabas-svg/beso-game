import {assetURL} from './assets.js';
export class Soundscape {
 constructor(){this.ctx=null;this.muted=false;this.voices=new Set();this.level='room';this.clock=0;this.ambientClock=0;this.breathClock=0;this.effects=new Set();this.volume=.8;}
 init(){
  if(this.ctx){void this.ctx.resume();return;}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=this.ctx=new AC();this.master=c.createGain();this.master.gain.value=.52;this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-15;this.compressor.ratio.value=5;this.master.connect(this.compressor);this.compressor.connect(c.destination);
  this.hum=c.createGain();this.hum.gain.value=.015;this.hum.connect(this.master);
  for(const hz of [50,100,151]){const o=c.createOscillator();o.type='sine';o.frequency.value=hz;o.connect(this.hum);o.start();}
  this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.7;
  void this.ctx.resume();this.setMuted(this.muted);
 }
 setMuted(v){this.muted=v;if(this.master)this.master.gain.setTargetAtTime(v?0:.52*this.volume,this.ctx.currentTime,.08);for(const a of this.voices){a.muted=v;a.volume=.8*this.volume;}}
 pause(v){this.paused=v;if(!this.ctx)return;if(v){void this.ctx.suspend();for(const a of this.voices)a.pause();}else{void this.ctx.resume();for(const a of this.voices)a.play().catch(()=>{});}}
 tone(freq=120,duration=.1,volume=.15,type='sine'){if(!this.ctx)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq*.55),c.currentTime+duration);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+duration);}
 noiseBurst(duration=.1,volume=.1,frequency=700,position){if(!this.ctx)return;const c=this.ctx,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noise;f.type='lowpass';f.frequency.value=frequency;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);n.connect(f);f.connect(g);
  if(position){const p=c.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=1.8;p.maxDistance=28;p.rolloffFactor=1.2;p.positionX.value=position.x;p.positionY.value=.15;p.positionZ.value=position.z;g.connect(p);p.connect(this.master);}else g.connect(this.master);n.start();n.stop(c.currentTime+duration);
 }
 step(pos,enemy=false,occluded=false){this.noiseBurst(enemy?.21:.12,enemy?(occluded?.18:.48):.07,enemy?(occluded?180:540):700,pos);}
 click(){this.noiseBurst(.05,.09,2400);}
 door(){this.tone(72,.8,.2,'sawtooth');this.noiseBurst(.5,.35,400);}
 pickup(){this.tone(620,.13,.09);setTimeout(()=>this.tone(820,.15,.07),90);}
 scare(reduced){this.noiseBurst(reduced?.24:.65,reduced?.2:.62,1900);this.tone(83,.8,reduced?.16:.4,'sawtooth');}
 voice(name){if(this.paused)return;this.stopVoice();const a=new Audio(assetURL(`/audio/${name}.mp3`));a.volume=.8*this.volume;a.muted=this.muted;this.voices.add(a);a.onended=()=>this.voices.delete(a);a.onerror=()=>this.voices.delete(a);a.play().catch(()=>{});}
 stopVoice(){for(const a of this.voices){a.pause();a.currentTime=0;}this.voices.clear();}
 listener(pos,yaw,pitch=0){if(!this.ctx)return;const l=this.ctx.listener;if(l.positionX){l.positionX.value=pos.x;l.positionY.value=pos.y;l.positionZ.value=pos.z;l.forwardX.value=-Math.sin(yaw)*Math.cos(pitch);l.forwardY.value=Math.sin(pitch);l.forwardZ.value=-Math.cos(yaw)*Math.cos(pitch);l.upX.value=0;l.upY.value=1;l.upZ.value=0;}}
 setVolume(v){this.volume=Math.max(0,Math.min(1,v));this.setMuted(this.muted);}
 note(freq,duration,volume,delay=0,type='sine'){
  if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);this.effects.add(o);o.onended=()=>{this.effects.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
 }
 stopEffects(){for(const o of this.effects){try{o.stop();}catch{}}this.effects.clear();}
 cinematic(id){this.stopEffects();this.hum?.gain.setTargetAtTime(.004,this.ctx?.currentTime||0,.2);if(id==='comedy'){[392,392,440,392,523,494,392,392,440,392,587,523].forEach((f,i)=>this.note(f,.38,.065,i*.34,'triangle'));}else if(id==='truth'){[196,247,294,392].forEach((f,i)=>this.note(f,4,.035,i*1.5));this.noiseBurst(2,.09,1800);}else if(id==='secret'){[110,116.5,220,233].forEach((f,i)=>this.note(f,9,.018,i*.25));}else{this.note(49,12,.055);this.note(51,12,.04);this.door();}}
 update(dt,threat,stage,sprinting=false,pos={x:0,z:0}){
  if(!this.ctx)return;this.hum.gain.setTargetAtTime(stage==='maze'?.028:.008,this.ctx.currentTime,.3);this.clock+=dt;this.breathClock+=dt;this.ambientClock+=dt;
  if(threat>.42&&this.clock>.55+(1-threat)*.75){this.tone(46,.12,.03+threat*.055);this.note(52,.1,.03,.15);this.clock=0;}
  if((sprinting||threat>.7)&&this.breathClock>(sprinting?.6:1.1)){this.noiseBurst(.33,sprinting?.075:.045,950);this.breathClock=0;}
  if(this.ambientClock>9+Math.random()*5){this.ambientClock=0;const a=Math.random()*Math.PI*2,p={x:pos.x+Math.cos(a)*7,z:pos.z+Math.sin(a)*7};if(stage==='maze'){this.noiseBurst(.8,.17,1700,p);this.noiseBurst(.12,.22,280,p);}else this.noiseBurst(.7,.08,260,p);}
 }
 dispose(){this.stopVoice();this.stopEffects();void this.ctx?.close();}
}
