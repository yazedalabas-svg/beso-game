// تفصيل مصفوفات الرؤوس داخل GLB: أي سمة تاكل الحجم وأي واحدة نقدر نخفّفها
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGLB } from './glb-report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPE = { 5120: 'i8', 5121: 'u8', 5122: 'i16', 5123: 'u16', 5125: 'u32', 5126: 'f32' };

for (const file of process.argv.slice(2)) {
  const { json, bin } = parseGLB(readFileSync(resolve(root, 'public/models', file)));
  console.log(`\n== ${file} == bin ${(bin.length / 1024) | 0}KB, meshes ${json.meshes?.length}, accessors ${json.accessors?.length}`);
  const totals = new Map();
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives) {
      for (const [name, index] of Object.entries(prim.attributes).concat(prim.indices != null ? [['INDICES', prim.indices]] : [])) {
        const acc = json.accessors[index];
        const view = json.bufferViews[acc.bufferView];
        totals.set(name, (totals.get(name) || 0) + view.byteLength);
      }
      for (const target of prim.targets || []) {
        for (const [name, index] of Object.entries(target)) {
          const view = json.bufferViews[json.accessors[index].bufferView];
          totals.set('MORPH_' + name, (totals.get('MORPH_' + name) || 0) + view.byteLength);
        }
      }
    }
  }
  for (const [name, bytes] of [...totals].sort((a, b) => b[1] - a[1])) {
    const sample = json.meshes.flatMap((m) => m.primitives).map((p) => p.attributes[name]).find((i) => i != null);
    const acc = sample != null ? json.accessors[sample] : null;
    console.log(`  ${name.padEnd(16)} ${String((bytes / 1024) | 0).padStart(5)}KB  ${acc ? `${acc.type} ${TYPE[acc.componentType]} count=${acc.count}` : ''}`);
  }
  console.log(`  animations: ${json.animations?.length || 0}, skins: ${json.skins?.length || 0}, joints: ${json.skins?.[0]?.joints?.length || 0}`);
}
