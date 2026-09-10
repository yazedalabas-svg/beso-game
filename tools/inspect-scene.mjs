// يفكّ فقط قطعة الـ JSON من ملف Scene.glb الكبير (بدون تحميل البيانات الثنائية بالكامل بالذاكرة)
// عشان نقدر نستعرض العُقد والأشبكة ونختار قطع محددة نستخرجها.
import { openSync, readSync, closeSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const file = process.argv[2];
const fd = openSync(file, 'r');
const header = Buffer.alloc(12);
readSync(fd, header, 0, 12, 0);
if (header.readUInt32LE(0) !== 0x46546c67) throw new Error('not glb');
const jsonHeader = Buffer.alloc(8);
readSync(fd, jsonHeader, 0, 8, 12);
const jsonLength = jsonHeader.readUInt32LE(0);
const jsonBuf = Buffer.alloc(jsonLength);
readSync(fd, jsonBuf, 0, jsonLength, 20);
closeSync(fd);
const json = JSON.parse(jsonBuf.toString('utf8'));

const size = statSync(file).size;
console.log(`file size: ${(size / 1024 / 1024).toFixed(1)}MB, json: ${(jsonLength / 1024).toFixed(0)}KB`);
console.log(`nodes: ${json.nodes?.length}, meshes: ${json.meshes?.length}, materials: ${json.materials?.length}, images: ${json.images?.length}, animations: ${json.animations?.length}, scenes: ${json.scenes?.length}`);

// شجرة المشهد: أسماء العقد الجذرية وعدد أبنائها (يساعد نتعرف على تسمية القطع الجاهزة للفصل)
const scene = json.scenes[json.scene ?? 0];
console.log(`\nroot nodes in default scene: ${scene.nodes.length}`);
const nameOf = (i) => json.nodes[i].name || `node${i}`;
const countDesc = (i, seen = new Set()) => { if (seen.has(i)) return 0; seen.add(i); let n = 1; for (const c of json.nodes[i].children || []) n += countDesc(c, seen); return n; };
const roots = scene.nodes.map((i) => ({ i, name: nameOf(i), count: countDesc(i) })).sort((a, b) => b.count - a.count);
for (const r of roots.slice(0, 60)) console.log(`  [${r.i}] ${r.name}  (subtree nodes: ${r.count})`);
if (roots.length > 60) console.log(`  ... and ${roots.length - 60} more root nodes`);

// حجم كل primitive بالبايت الفعلي (count × نوع العنصر)، لا حجم bufferView المشترك بين accessors كثيرة
const COMPONENT_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const accessorBytes = (idx) => { const a = json.accessors[idx]; return a.count * COMPONENT_SIZE[a.componentType] * COMPONENTS[a.type]; };
const meshBytes = (meshIdx) => {
  const mesh = json.meshes[meshIdx];
  let bytes = 0, verts = 0, tris = 0;
  for (const prim of mesh.primitives) {
    for (const idx of Object.values(prim.attributes)) bytes += accessorBytes(idx);
    if (prim.indices != null) { bytes += accessorBytes(prim.indices); tris += json.accessors[prim.indices].count / 3; }
    verts += json.accessors[prim.attributes.POSITION]?.count || 0;
  }
  return { bytes, verts, tris };
};
const meshUsers = new Map();
for (const node of json.nodes) if (node.mesh != null) meshUsers.set(node.mesh, (meshUsers.get(node.mesh) || []).concat(node.name || ''));
const meshSizes = (json.meshes || []).map((m, i) => ({ i, name: m.name, ...meshBytes(i), users: meshUsers.get(i) || [] })).sort((a, b) => b.bytes - a.bytes);
console.log(`\ntop 40 heaviest meshes (real per-accessor vertex data):`);
for (const m of meshSizes.slice(0, 40)) console.log(`  ${(m.bytes / 1024).toFixed(0).padStart(6)}KB  ${String(m.tris).padStart(6)} tris  mesh[${m.i}] "${m.name}"  used by ${m.users.length}x: ${m.users.slice(0, 2).join(', ')}`);

console.log(`\ntotal geometry bytes (actual): ${(meshSizes.reduce((s, m) => s + m.bytes, 0) / 1024 / 1024).toFixed(1)}MB`);
console.log(`total triangles: ${meshSizes.reduce((s, m) => s + m.tris, 0)}`);
console.log(`materials (${json.materials.length}):`, (json.materials || []).map((m) => m.name).join(', '));
console.log(`images (${json.images.length}):`, (json.images || []).map((m) => m.name || m.uri).join(', '));

// أسماء الأشكال حسب النوع الهندسي (Box/Pipe/HalfSphere/Cylinder/CURVE...) لمعرفة تنوع القطع المتاحة
const kinds = new Map();
for (const m of json.meshes) { const kind = (m.name || '').match(/^Shape_(?:RR_|CURVE_)?([A-Za-z]+)/)?.[1] || 'other'; kinds.set(kind, (kinds.get(kind) || 0) + 1); }
console.log(`\nshape kinds:`, [...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join(' '));
