// يستخرج مسارات أيقونات lucide المستعملة في اللعبة إلى ملف JSON واحد
// حتى تشتغل النسخة المستقلة بدون أي حزم خارجية.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const WANTED = [
  'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'AudioLines', 'VolumeX',
  'Flashlight', 'KeyRound', 'Footprints', 'Pause', 'BookOpen', 'DoorOpen',
  'Clock3', 'Coffee', 'RotateCcw', 'Eye', 'Headphones', 'Play', 'Check',
  'ChevronLeft', 'ShieldCheck', 'Videotape', 'ScanLine',
];

const source = readFileSync(resolve(root, 'node_modules/lucide-react/dist/lucide-react.d.ts'), 'utf8');
const icons = {};

for (const name of WANTED) {
  const marker = `@name ${name}\n`;
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`icon not found in lucide types: ${name}`);
  const preview = source.slice(at, at + 4000).match(/base64,([A-Za-z0-9+/=]+)\)/);
  if (!preview) throw new Error(`no preview payload for icon: ${name}`);
  const svg = Buffer.from(preview[1], 'base64').toString('utf8');
  // نحتفظ بمحتوى الـ svg فقط، والسمات نضيفها وقت الرسم
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  icons[name] = inner.replace(/\s+/g, ' ');
}

mkdirSync(resolve(root, 'standalone'), { recursive: true });
writeFileSync(resolve(root, 'standalone/icons.json'), JSON.stringify(icons, null, 1), 'utf8');
console.log(`extracted ${Object.keys(icons).length} icons`);
