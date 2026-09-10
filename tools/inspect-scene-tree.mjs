// يطبع أول مستويين من شجرة العُقد تحت الجذر، مع bounding box تقريبي لكل عقدة فرعية،
// عشان نحدد "تجمعات" (كل مجموعة أنابيب/سكك) نقدر نصدّرها كقطعة واحدة صغيرة.
import { openSync, readSync, closeSync } from 'node:fs';

const file = process.argv[2];
const fd = openSync(file, 'r');
const jsonHeader = Buffer.alloc(8);
readSync(fd, jsonHeader, 0, 8, 12);
const jsonLength = jsonHeader.readUInt32LE(0);
const jsonBuf = Buffer.alloc(jsonLength);
readSync(fd, jsonBuf, 0, jsonLength, 20);
closeSync(fd);
const json = JSON.parse(jsonBuf.toString('utf8'));

const root = json.scenes[json.scene ?? 0].nodes[0];
const rootNode = json.nodes[root];
console.log(`root "${rootNode.name}" has ${rootNode.children?.length || 0} direct children`);

function collectMeshes(nodeIdx, acc = []) {
  const n = json.nodes[nodeIdx];
  if (n.mesh != null) acc.push(nodeIdx);
  for (const c of n.children || []) collectMeshes(c, acc);
  return acc;
}
function materialsUsed(meshNodeIdxs) {
  const mats = new Set();
  for (const idx of meshNodeIdxs) { const mesh = json.meshes[json.nodes[idx].mesh]; for (const p of mesh.primitives) if (p.material != null) mats.add(p.material); }
  return mats;
}
function imagesFor(matIdxs) {
  const imgs = new Set();
  for (const mi of matIdxs) {
    const m = json.materials[mi];
    const stack = [m];
    while (stack.length) { const o = stack.pop(); if (!o || typeof o !== 'object') continue; if (Number.isInteger(o.index) && o.index < json.textures.length) imgs.add(json.textures[o.index].source); for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v); }
  }
  return imgs;
}

function triCount(meshNodeIdxs) {
  let tris = 0, verts = 0;
  for (const idx of meshNodeIdxs) { const mesh = json.meshes[json.nodes[idx].mesh]; for (const p of mesh.primitives) { verts += json.accessors[p.attributes.POSITION]?.count || 0; if (p.indices != null) tris += json.accessors[p.indices].count / 3; } }
  return { tris, verts };
}

const children = rootNode.children || [];
const rows = children.map((idx) => {
  const meshNodes = collectMeshes(idx);
  const mats = materialsUsed(meshNodes);
  const imgs = imagesFor(mats);
  const { tris, verts } = triCount(meshNodes);
  return { idx, name: json.nodes[idx].name, meshCount: meshNodes.length, tris, verts, mats: [...mats].map((i) => json.materials[i].name), imgs: [...imgs] };
});
rows.sort((a, b) => b.tris - a.tris);
console.log(`\n${rows.length} direct child groups:`);
for (const r of rows) console.log(`  [${r.idx}] "${r.name}"  meshes=${r.meshCount}  tris=${r.tris}  verts=${r.verts}  materials=[${r.mats.join(', ')}]`);
