import {spawnSync} from 'node:child_process';
import {renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {VOICE_LINES} from '../game/voice-lines.js';

const root=resolve(import.meta.dirname,'..');
const story=JSON.parse(await (await import('node:fs/promises')).readFile(resolve(root,'game/cinema-story.json'),'utf8'));
const files=[];

for(const [ending,data] of Object.entries(story))for(let index=0;index<data.beats.length;index++){
 if(data.beats[index][1]==='بيسو')files.push(`jojo-${ending}-${index}.mp3`);
}
for(const [name,line] of Object.entries(VOICE_LINES))if(line.speaker==='بيسو')files.push(`${name}.mp3`);

for(const name of files){
 const source=resolve(root,'public/audio',name);
 const temporary=resolve(root,'work/eleven-audio',`${name}.treated.mp3`);
 const filter='rubberband=pitch=1.09,highpass=f=85,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=2500:t=q:w=1:g=2,acompressor=threshold=-18dB:ratio=2:attack=10:release=120';
 const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-af',filter,'-codec:a','libmp3lame','-b:a','128k',temporary],{stdio:'inherit'});
 if(result.status!==0)throw new Error(`Could not treat ${name}`);
 renameSync(temporary,source);
}

console.log(`Treated ${files.length} Beso lines with a lighter, younger vocal profile.`);
