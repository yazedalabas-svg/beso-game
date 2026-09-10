// تقرير سريع: وش اللي ياكل الحجم داخل كل ملف GLB
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function parseGLB(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
  let offset = 12, json = null, bin = null;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (type === 0x004e4942) bin = Buffer.from(chunk);
    offset += 8 + length + ((4 - (length % 4)) % 4) * 0; // الأطوال في GLB مضبوطة أصلاً على 4
  }
  return { json, bin };
}

for (const file of readdirSync(resolve(root, 'public/models')).filter((f) => f.endsWith('.glb'))) {
  const buffer = readFileSync(resolve(root, 'public/models', file));
  const { json, bin } = parseGLB(buffer);
  let imageBytes = 0;
  const images = [];
  for (const image of json.images || []) {
    const view = json.bufferViews[image.bufferView];
    imageBytes += view.byteLength;
    const bytes = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    const meta = await sharp(bytes).metadata();
    images.push(`${meta.width}x${meta.height} ${meta.format} ${(view.byteLength / 1024) | 0}KB`);
  }
  const ext = Object.keys(json.extensionsUsed || {}).length ? json.extensionsUsed.join(',') : '-';
  console.log(
    `${file.padEnd(18)} total ${String(((buffer.length / 1024) | 0)).padStart(5)}KB  images ${String(((imageBytes / 1024) | 0)).padStart(5)}KB  geometry ${String((((bin.length - imageBytes) / 1024) | 0)).padStart(5)}KB  ext:${ext}`,
  );
  for (const line of images) console.log(`   · ${line}`);
}
