import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {VOICE_LINES} from '../game/voice-lines.js';

const root=resolve(import.meta.dirname,'..');
const env=readFileSync(resolve(root,'.env.local'),'utf8');
const keyName=process.argv.includes('--key2')?'ELEVENLABS_API_KEY2':'ELEVENLABS_API_KEY';
const key=env.match(new RegExp('^'+keyName+'=(.+)$','m'))?.[1]?.trim();
if(!key)throw new Error(keyName+' is missing');
const fallbackName=keyName==='ELEVENLABS_API_KEY'?'ELEVENLABS_API_KEY2':'ELEVENLABS_API_KEY';
const fallbackKey=env.match(new RegExp('^'+fallbackName+'=(.+)$','m'))?.[1]?.trim();
const keys=[key,fallbackKey].filter((value,index,list)=>value&&list.indexOf(value)===index);
const story=JSON.parse(readFileSync(resolve(root,'game/cinema-story.json'),'utf8'));
const output=resolve(root,'public/audio'),temp=resolve(root,'work/eleven-audio');mkdirSync(temp,{recursive:true});
// Keep every recurring speaker on a genuinely different ElevenLabs performer.
// Beso is younger and more reactive; Marzooq is deep and controlled; the system
// voice is firm and neutral so it cannot be mistaken for either character.
const voices={
 بيسو:{id:'ErXwobaYiN019PkySvjV',settings:{stability:.34,similarity_boost:.70,style:.46,use_speaker_boost:true}},
 مرزوق:{id:'pNInz6obpgDQGcFmaJgB',settings:{stability:.72,similarity_boost:.86,style:.12,use_speaker_boost:true}},
 النظام:{id:'VR6AewLTigWG4xSOukaG',settings:{stability:.82,similarity_boost:.78,style:.08,use_speaker_boost:true}}
};
if(new Set(Object.values(voices).map(voice=>voice.id)).size!==Object.keys(voices).length)throw new Error('Every character must use a distinct ElevenLabs performer');
const missingOnly=process.argv.includes('--missing-only');

async function request(url,body,name){
 if(missingOnly&&existsSync(resolve(output,name))){console.log('skip '+name);return;}
 let lastError='';for(const apiKey of keys){const response=await fetch(url,{method:'POST',headers:{'xi-api-key':apiKey,'content-type':'application/json','accept':'audio/mpeg'},body:JSON.stringify(body)});if(response.ok){const next=resolve(temp,name),final=resolve(output,name);writeFileSync(next,Buffer.from(await response.arrayBuffer()));renameSync(next,final);console.log(name);return;}try{lastError=(await response.json())?.detail?.message||String(response.status);}catch{lastError=String(response.status);}}
 throw new Error(name+': '+lastError);
}

async function speak(name,speaker,text){
 const voice=voices[speaker]||voices.النظام;
 await request('https://api.elevenlabs.io/v1/text-to-speech/'+voice.id,{text,model_id:'eleven_multilingual_v2',voice_settings:voice.settings},name);
}

const onlyNew=process.argv.includes('--new-only');
const voicesOnly=process.argv.includes('--voices-only');
if(!onlyNew)for(const [ending,data] of Object.entries(story))for(let i=0;i<data.beats.length;i++){
 const [,speaker,text]=data.beats[i];
 await speak('jojo-'+ending+'-'+i+'.mp3',speaker,text);
}

if(!onlyNew)for(const [name,line] of Object.entries(VOICE_LINES))await speak(name+'.mp3',line.speaker,line.text);

const effects={
 'sfx-bat.mp3':{text:'Terrifying bat swarm suddenly flapping directly past the listener in a dark hallway, sharp wings and one piercing screech, horror game jumpscare, no music',duration_seconds:2.2},
 'sfx-mouse.mp3':{text:'Large rat suddenly scurrying across old carpet close to the listener, claws scratching and a sharp squeak, horror game jumpscare, no music',duration_seconds:1.8},
 'sfx-blackout.mp3':{text:'Industrial fluorescent lights rapidly buzz, pop and completely power down, distant electrical transformer thump, dark horror ambience, no music',duration_seconds:3.4},
 'sfx-power.mp3':{text:'Old electrical breaker pulled, relays clunk, fluorescent lights flicker and power back on, realistic indoor sound, no music',duration_seconds:2.8},
 'sfx-locker.mp3':{text:'Old rusty metal locker door opens with a painfully loud long squeal and hollow slam in an empty hallway, no music',duration_seconds:2.4},
 'sfx-jumpscare.mp3':{text:'Sudden close monster impact, deep roar, heavy body hit and distorted sting for a horror game jumpscare, no speech, no music',duration_seconds:2.1}
};
if(!onlyNew&&!voicesOnly)for(const [name,body] of Object.entries(effects))await request('https://api.elevenlabs.io/v1/sound-generation',{...body,prompt_influence:.55},name);
console.log('ElevenLabs audio complete');
