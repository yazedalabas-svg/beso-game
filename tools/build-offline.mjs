import {build} from 'esbuild';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets={};
// نفضّل نسخة build/ المصغّرة إن وُجدت (tools/optimize-assets.mjs)، وإلا نرجع للأصل في public/
const pick=(dir,file)=>{const built=resolve(root,'build',dir,file);return existsSync(built)?built:resolve(root,'public',dir,file);};
for(const [dir,mime] of [['models','model/gltf-binary'],['audio','audio/mpeg']])for(const file of readdirSync(resolve(root,'public',dir))){if(!/\.(glb|mp3)$/.test(file))continue;assets[`/${dir}/${file}`]=`data:${mime};base64,${readFileSync(pick(dir,file)).toString('base64')}`;}
assets['/textures/memory.png']='data:image/jpeg;base64,'+readFileSync(resolve(root,'standalone/memory.jpg')).toString('base64');
const result=await build({stdin:{contents:`import {BesoGame} from './game/engine.js';import {mountUI} from './standalone/ui.js';window.beso=mountUI(document.getElementById('app'),(stage,emit)=>new BesoGame(stage,emit));`,resolveDir:root,sourcefile:'standalone-entry.js'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const css=readFileSync(resolve(root,'app/game.css'),'utf8');
// نخرج محتوى صفحة بدون html/head/body: هذا شكل الـ Artifact، ويشتغل كذلك لو فتحت الملف مباشرة.
// الاتجاه واللغة نضبطهم من CSS و JS بدل سمات <html> اللي ما نملكها هناك.
const html=`<title>لا تطلع يا بيسو</title>
<meta name="description" content="رعب وكوميديا بمنظور الشخص الأول: غرفة مظلمة، متاهة باك رومز، وأربع نهايات بأسلوب جوجو.">
<style>html,body{direction:rtl}
${css}</style>
<div id="app"></div>
<script>document.documentElement.setAttribute('dir','rtl');document.documentElement.setAttribute('lang','ar');
window.__BESO_ASSETS=${JSON.stringify(assets)};
${js}</script>`;
mkdirSync(resolve(root,'standalone'),{recursive:true});writeFileSync(resolve(root,'standalone/beso.html'),html);console.log(`Offline game: ${(Buffer.byteLength(html)/1048576).toFixed(1)} MB; ${Object.keys(assets).length} embedded assets`);
