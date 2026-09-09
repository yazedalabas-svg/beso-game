// يحوّل أصول public/ إلى data URI داخل standalone/assets.json
// (الصورة تُصغَّر يدويًا مسبقًا إلى standalone/memory.jpg لتخفيف حجم الملف الواحد)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uri = (p, mime) => `data:${mime};base64,` + readFileSync(resolve(root, p)).toString('base64');

const photo = existsSync(resolve(root, 'standalone/memory.jpg'))
  ? uri('standalone/memory.jpg', 'image/jpeg')
  : uri('public/textures/memory.png', 'image/png');

const assets = {
  memory: photo,
  opening: uri('public/audio/opening.mp3', 'audio/mpeg'),
  comedy: uri('public/audio/comedy.mp3', 'audio/mpeg'),
};

mkdirSync(resolve(root, 'standalone'), { recursive: true });
writeFileSync(resolve(root, 'standalone/assets.json'), JSON.stringify(assets), 'utf8');
for (const [k, v] of Object.entries(assets)) console.log(`${k}: ${(v.length / 1024).toFixed(0)} KB`);
