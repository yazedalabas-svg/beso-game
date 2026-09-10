// يستخرج تجمّعات مختارة من مشهد Rec Room الضخم (source/Scene.glb) كقطع ديكور صغيرة
// جاهزة لخط الأنابيب الحالي (public/models/<name>.glb يحمّله GameAssets بالاسم).
//
// كل عقدة "SHAPE_CONTAINER" أصلها مئات القطع البدائية (صناديق/أنابيب/كرات) بدون خامات
// صور محمّلة فعليًا هنا؛ نكتفي بلون كل مادة (baseColorFactor) ونديها كمادة PBR مسطّحة،
// ونجمّع كل القطع المتشابهة اللون في primitive واحد بدل مئات الأشبكة — نفس أسلوب اللعبة
// الحالي (ألوان مسطحة على هندسة Box/Cylinder) لكن بهندسة حقيقية غنية من الحزمة الجديدة.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sceneFile = resolve(root, 'work/rec-room-import/source/Scene.glb');

globalThis.window ??= { innerWidth: 1920, innerHeight: 1080 };
globalThis.self ??= globalThis;
globalThis.URL.createObjectURL ??= () => 'blob:stub';
globalThis.URL.revokeObjectURL ??= () => {};
// بدون هذا التصحيح GLTFLoader يحاول new Image()/ImageBitmapLoader لتحميل الخامات، وما فيها دعم في Node.
// ما نحتاج بكسلات الصور أصلاً؛ الألوان المسطحة تجي من baseColorFactor مباشرة.
THREE.TextureLoader.prototype.load = function load(_url, onLoad) {
  const texture = new THREE.Texture();
  queueMicrotask(() => onLoad?.(texture));
  return texture;
};
// نخفي createImageBitmap أثناء التحليل فقط، فيرجع GLTFLoader لمسار TextureLoader أعلاه بدل ImageBitmapLoader.
const nativeCreateImageBitmap = globalThis.createImageBitmap;
delete globalThis.createImageBitmap;
class FileReaderPolyfill {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((value) => { this.result = value; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((value) => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
}
globalThis.FileReader ??= FileReaderPolyfill;

// التجمعات المختارة من work/rec-room-import (بالاسم كما ظهر في tools/inspect-scene-tree.mjs).
// الأسماء أدناه معطاة بعد معاينة بصرية فعلية لكل قطعة (tools/inspect-scene-tree.mjs يعطي
// أرقام العُقد فقط، بلا وصف — راجع work/preview-*.png لقرار كل اسم).
// name: اسم ملف الإخراج تحت public/models/. container: اسم عقدة SHAPE_CONTAINER الجذرية.
const PICKS = [
  { name: 'rr-tv-table', container: 'SHAPE_CONTAINER_608e9b0f0d9b40c49ca1ac6902314edc' }, // طاولة دائرية + تلفزيون قديم وريموت
  { name: 'rr-plush-bunny', container: 'SHAPE_CONTAINER_52af31d17b404e82b1f5487ce96dc962' }, // دبدوب/أرنب قماش بنفسجي
  { name: 'rr-rail-post', container: 'SHAPE_CONTAINER_2a15a038025c476c8d0a1c5e8cfc61ac' }, // قاعدة معدنية بثلاثة أعمدة (سياج/درابزين)
  { name: 'rr-door-frame', container: 'SHAPE_CONTAINER_f9b56916d17f4dca9bd132957ccac717' }, // إطار باب مسطّح
];

console.log('Parsing Scene.glb (this can take a while)...');
const buffer = readFileSync(sceneFile);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(arrayBuffer, '', res, rej));
gltf.scene.updateMatrixWorld(true);
console.log('Parsed.');

function findByName(root, name) { let found = null; root.traverse((o) => { if (!found && o.name === name) found = o; }); return found; }

// ماديّة PBR مسطحة من material أصلي في glTF: نحافظ على baseColorFactor/roughness/metalness،
// ونعيد تفسير مواد "Neon" كإضاءة ذاتية بلون المادة نفسه بدل الأبيض الخام (emissiveFactor:[1,1,1]
// في هذا الملف بلا خامة انبعاث، فيطلع أبيض بحت لو تركناه كما هو — تصحيح مقصود لمظهر أوضح).
function flatMaterial(original) {
  const isNeon = /neon/i.test(original.name || '');
  const color = original.color ? original.color.clone() : new THREE.Color(0x808080);
  const mat = new THREE.MeshStandardMaterial({
    name: original.name,
    color,
    roughness: isNeon ? 0.4 : (original.roughness ?? 0.85),
    metalness: isNeon ? 0 : (original.metalness ?? 0),
  });
  if (isNeon) { mat.emissive = color.clone(); mat.emissiveIntensity = 1.3; }
  return mat;
}

// هندسة موقع فقط: نبني بيانات نظيفة (position + normal) بمقياس العالم (baked)، بدون UV/لون/tangent
// حتى يصير الدمج بين آلاف الأشكال الصغيرة صالحًا داخل primitive واحد لكل مادة.
function bakeGeometry(mesh) {
  const src = mesh.geometry;
  const position = src.getAttribute('position');
  if (!position) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', position.clone());
  if (src.getAttribute('normal')) geo.setAttribute('normal', src.getAttribute('normal').clone());
  if (src.getIndex()) geo.setIndex(src.getIndex().clone());
  geo.applyMatrix4(mesh.matrixWorld);
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  return geo;
}

for (const pick of PICKS) {
  const containerNode = findByName(gltf.scene, pick.container);
  if (!containerNode) { console.warn(`container not found: ${pick.container}`); continue; }

  const byMaterial = new Map(); // materialName -> {material, geometries:[]}
  let meshCount = 0, skipped = 0;
  containerNode.traverse((o) => {
    if (!o.isMesh) return;
    meshCount++;
    const geo = bakeGeometry(o);
    if (!geo || !geo.getAttribute('position')?.count) { skipped++; return; }
    const key = o.material?.name || 'default';
    if (!byMaterial.has(key)) byMaterial.set(key, { material: flatMaterial(o.material), geometries: [] });
    byMaterial.get(key).geometries.push(geo);
  });

  const group = new THREE.Group();
  group.name = pick.name;
  let totalTris = 0, totalVerts = 0;
  for (const [key, bucket] of byMaterial) {
    const merged = bucket.geometries.length > 1 ? mergeGeometries(bucket.geometries, false) : bucket.geometries[0];
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, bucket.material);
    mesh.name = key;
    group.add(mesh);
    totalTris += (merged.getIndex()?.count ?? merged.getAttribute('position').count) / 3;
    totalVerts += merged.getAttribute('position').count;
  }
  console.log(`[${pick.name}] meshes=${meshCount} (skipped ${skipped}) materials=${byMaterial.size} tris=${Math.round(totalTris)} verts=${totalVerts}`);

  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(group, { binary: true, onlyVisible: true, truncateDrawRange: true });
  const outPath = resolve(root, 'public/models', `${pick.name}.glb`);
  writeFileSync(outPath, Buffer.from(glb));
  console.log(`  -> ${outPath} (${(Buffer.byteLength(glb) / 1024).toFixed(0)}KB)`);
}
