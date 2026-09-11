import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const env=readFileSync(resolve(root,'.env.local'),'utf8');
const keyName=process.argv.includes('--key2')?'ELEVENLABS_API_KEY2':'ELEVENLABS_API_KEY';
const key=env.match(new RegExp('^'+keyName+'=(.+)$','m'))?.[1]?.trim();
if(!key)throw new Error(keyName+' is missing');
const story=JSON.parse(readFileSync(resolve(root,'game/cinema-story.json'),'utf8'));
const output=resolve(root,'public/audio'),temp=resolve(root,'work/eleven-audio');mkdirSync(temp,{recursive:true});
const headers={'xi-api-key':key,'content-type':'application/json','accept':'audio/mpeg'};
const voices={بيسو:'ErXwobaYiN019PkySvjV',مرزوق:'pNInz6obpgDQGcFmaJgB',النظام:'pNInz6obpgDQGcFmaJgB'};
const missingOnly=process.argv.includes('--missing-only');

async function request(url,body,name){
 if(missingOnly&&existsSync(resolve(output,name))){console.log('skip '+name);return;}
 const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});
 if(!response.ok){let detail='';try{detail=(await response.json())?.detail?.message||'';}catch{}throw new Error(name+': '+response.status+' '+detail);}
 const next=resolve(temp,name),final=resolve(output,name);writeFileSync(next,Buffer.from(await response.arrayBuffer()));renameSync(next,final);console.log(name);
}

async function speak(name,speaker,text){
 const voice=voices[speaker]||voices.مرزوق;
 await request('https://api.elevenlabs.io/v1/text-to-speech/'+voice,{text,model_id:'eleven_multilingual_v2',voice_settings:{stability:speaker==='مرزوق'?.58:.48,similarity_boost:.76,style:speaker==='مرزوق'?.22:.35,use_speaker_boost:true}},name);
}

const onlyNew=process.argv.includes('--new-only');
if(!onlyNew)for(const [ending,data] of Object.entries(story))for(let i=0;i<data.beats.length;i++){
 const [,speaker,text]=data.beats[i];
 await speak('jojo-'+ending+'-'+i+'.mp3',speaker,text);
}

// تعليقات بيسو القصيرة على أغراض ديكور المتاهة الجديدة (الدبدوب، التلفزيون) — بدون أثر على مسار اللعب.
const flavor=[
 ['bunny.mp3','بيسو','دبدوب؟ هنا؟ ...ليش ما تفاجئني.'],
 ['bunny-again.mp3','بيسو','للحين هنا يا صديقي.'],
 ['tv.mp3','بيسو','حتى التلفزيون مقطوع عنه الكهربا.'],
];
for(const [name,speaker,text] of flavor)await speak(name,speaker,text);

const effects={
 'sfx-bat.mp3':{text:'Terrifying bat swarm suddenly flapping directly past the listener in a dark hallway, sharp wings and one piercing screech, horror game jumpscare, no music',duration_seconds:2.2},
 'sfx-mouse.mp3':{text:'Large rat suddenly scurrying across old carpet close to the listener, claws scratching and a sharp squeak, horror game jumpscare, no music',duration_seconds:1.8},
 'sfx-blackout.mp3':{text:'Industrial fluorescent lights rapidly buzz, pop and completely power down, distant electrical transformer thump, dark horror ambience, no music',duration_seconds:3.4},
 'sfx-power.mp3':{text:'Old electrical breaker pulled, relays clunk, fluorescent lights flicker and power back on, realistic indoor sound, no music',duration_seconds:2.8},
 'sfx-locker.mp3':{text:'Old rusty metal locker door opens with a painfully loud long squeal and hollow slam in an empty hallway, no music',duration_seconds:2.4},
 'sfx-jumpscare.mp3':{text:'Sudden close monster impact, deep roar, heavy body hit and distorted sting for a horror game jumpscare, no speech, no music',duration_seconds:2.1}
};
if(!onlyNew)for(const [name,body] of Object.entries(effects))await request('https://api.elevenlabs.io/v1/sound-generation',{...body,prompt_influence:.55},name);
console.log('ElevenLabs audio complete');
