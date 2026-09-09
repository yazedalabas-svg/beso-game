import {build} from 'esbuild';
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets={};
for(const [dir,mime] of [['models','model/gltf-binary'],['audio','audio/mpeg']])for(const file of readdirSync(resolve(root,'public',dir))){if(!/\.(glb|mp3)$/.test(file))continue;assets[`/${dir}/${file}`]=`data:${mime};base64,${readFileSync(resolve(root,'public',dir,file)).toString('base64')}`;}
assets['/textures/memory.png']='data:image/jpeg;base64,'+readFileSync(resolve(root,'standalone/memory.jpg')).toString('base64');
const result=await build({stdin:{contents:`import {BesoGame} from './game/engine.js';import {mountUI} from './standalone/ui.js';mountUI(document.getElementById('app'),(stage,emit)=>new BesoGame(stage,emit));`,resolveDir:root,sourcefile:'standalone-entry.js'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const css=readFileSync(resolve(root,'app/game.css'),'utf8');
const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>لا تطلع يا بيسو — النسخة المطوّرة</title><style>${css}</style></head><body><div id="app"></div><script>window.__BESO_ASSETS=${JSON.stringify(assets)};${js}</script></body></html>`;
mkdirSync(resolve(root,'standalone'),{recursive:true});writeFileSync(resolve(root,'standalone/beso.html'),html);console.log(`Offline game: ${(Buffer.byteLength(html)/1048576).toFixed(1)} MB; ${Object.keys(assets).length} embedded assets`);
