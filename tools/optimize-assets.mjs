// يصغّر أصول اللعبة قبل دمجها في الملف الواحد:
//  · الموديلات: يشيل السمات غير المستعملة، يصغّر الخامات، ويحوّل أوزان الجلد إلى u8
//  · الأصوات: يعيد ترميزها mono بمعدل أقل
// المصدر public/ ما يتغيّر أبدًا؛ المخرجات تروح إلى build/.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { simplifyGeometry } from './simplify-geometry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_TEXTURE = 512;
const JPEG_QUALITY = 74;
const KB = (n) => `${Math.round(n / 1024)}KB`;

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function parseGLB(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
  let offset = 12, json = null, bin = Buffer.alloc(0);
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(chunk.toString('utf8'));
    else if (type === BIN_CHUNK) bin = Buffer.from(chunk);
    offset += 8 + length;
  }
  return { json, bin };
}

function writeGLB(json, bin) {
  const jsonChunk = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = (4 - (jsonChunk.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const parts = [
    Buffer.alloc(12),
    Buffer.alloc(8), jsonChunk, Buffer.alloc(jsonPad, 0x20),
    Buffer.alloc(8), bin, Buffer.alloc(binPad, 0),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  parts[0].writeUInt32LE(0x46546c67, 0); parts[0].writeUInt32LE(2, 4); parts[0].writeUInt32LE(total, 8);
  parts[1].writeUInt32LE(jsonChunk.length + jsonPad, 0); parts[1].writeUInt32LE(JSON_CHUNK, 4);
  parts[4].writeUInt32LE(bin.length + binPad, 0); parts[4].writeUInt32LE(BIN_CHUNK, 4);
  return Buffer.concat(parts, total);
}

const COMPONENT_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

// يقرأ بيانات accessor كـ Float32Array منطقية (بعد فك التطبيع)
function readAccessor(json, bin, index) {
  const acc = json.accessors[index];
  const view = json.bufferViews[acc.bufferView];
  const size = COMPONENT_SIZE[acc.componentType], count = COMPONENTS[acc.type];
  const stride = view.byteStride || size * count;
  const base = (view.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Float32Array(acc.count * count);
  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < count; c++) {
      const at = base + i * stride + c * size;
      let value;
      switch (acc.componentType) {
        case 5120: value = bin.readInt8(at); break;
        case 5121: value = bin.readUInt8(at); break;
        case 5122: value = bin.readInt16LE(at); break;
        case 5123: value = bin.readUInt16LE(at); break;
        case 5125: value = bin.readUInt32LE(at); break;
        default: value = bin.readFloatLE(at);
      }
      out[i * count + c] = value;
    }
  }
  return out;
}

/** يعيد بناء GLB: يشيل السمات غير المستخدمة، يضغط الخامات، ويحوّل الأوزان إلى u8. */
async function optimizeGLB(buffer, name) {
  const { json, bin } = parseGLB(buffer);

  // ١) أي مجموعة UV تستعملها الخامات فعلاً؟
  // مرجع الخامة في glTF هو أي كائن فيه `index` يشير إلى textures[]، و texCoord افتراضيها 0.
  const usedUV = new Set();
  const textureCount = (json.textures || []).length;
  const scanTextureRefs = (node, seen = new Set()) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { for (const item of node) scanTextureRefs(item, seen); return; }
    if (Number.isInteger(node.index) && node.index < textureCount && !('name' in node)) usedUV.add(node.texCoord ?? 0);
    for (const value of Object.values(node)) if (value && typeof value === 'object') scanTextureRefs(value, seen);
  };
  scanTextureRefs(json.materials || []);
  if (!usedUV.size) usedUV.add(0);

  // ٢) نبني بيانات جديدة لكل accessor مع إمكانية تحويل النوع
  const replacement = new Map(); // accessorIndex -> {bytes, componentType, normalized}
  const dropped = [];
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives) {
      for (const semantic of Object.keys(prim.attributes)) {
        const uv = /^TEXCOORD_(\d+)$/.exec(semantic);
        const color = /^COLOR_(\d+)$/.exec(semantic);
        // three يقرأ COLOR_0 فقط، و UV غير المشار إليها من أي خامة ما تُستعمل
        if ((uv && !usedUV.has(Number(uv[1]))) || (color && Number(color[1]) > 0)) {
          dropped.push(semantic);
          delete prim.attributes[semantic];
        }
      }
      // أوزان الجلد f32 → u8 مطبَّعة: نفس الشكل بربع الحجم
      const weights = prim.attributes.WEIGHTS_0;
      if (weights != null && json.accessors[weights].componentType === 5126 && !replacement.has(weights)) {
        const data = readAccessor(json, bin, weights);
        const bytes = Buffer.alloc(data.length);
        for (let i = 0; i < data.length; i += 4) {
          let sum = 0;
          const quantized = [0, 0, 0, 0];
          for (let c = 0; c < 4; c++) { quantized[c] = Math.round(Math.max(0, Math.min(1, data[i + c])) * 255); sum += quantized[c]; }
          // نضمن أن مجموع الأوزان يظل 255 بعد التقريب
          if (sum !== 255 && sum > 0) {
            let best = 0;
            for (let c = 1; c < 4; c++) if (quantized[c] > quantized[best]) best = c;
            quantized[best] = Math.max(0, Math.min(255, quantized[best] + (255 - sum)));
          }
          for (let c = 0; c < 4; c++) bytes[i + c] = quantized[c];
        }
        replacement.set(weights, { bytes, componentType: 5121, normalized: true });
      }
    }
  }

  // ٣) نضغط الصور
  let textureBefore = 0, textureAfter = 0;
  for (const image of json.images || []) {
    if (image.bufferView == null) continue;
    const view = json.bufferViews[image.bufferView];
    const source = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    textureBefore += source.length;
    const meta = await sharp(source).metadata();
    const width = Math.min(MAX_TEXTURE, meta.width || MAX_TEXTURE);
    const bytes = await sharp(source).resize(width, null, { withoutEnlargement: true }).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    textureAfter += bytes.length;
    image.__bytes = bytes;
    image.mimeType = 'image/jpeg';
  }

  // ٤) إعادة رصف: نكتب فقط ما هو مُشار إليه فعلاً
  const usedAccessors = new Set();
  for (const mesh of json.meshes || []) for (const prim of mesh.primitives) {
    for (const index of Object.values(prim.attributes)) usedAccessors.add(index);
    if (prim.indices != null) usedAccessors.add(prim.indices);
    for (const target of prim.targets || []) for (const index of Object.values(target)) usedAccessors.add(index);
  }
  for (const skin of json.skins || []) if (skin.inverseBindMatrices != null) usedAccessors.add(skin.inverseBindMatrices);
  for (const animation of json.animations || []) for (const sampler of animation.samplers) { usedAccessors.add(sampler.input); usedAccessors.add(sampler.output); }

  const chunks = [];
  let cursor = 0;
  const push = (bytes) => {
    const padding = (4 - (cursor % 4)) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); cursor += padding; }
    const offset = cursor;
    chunks.push(bytes); cursor += bytes.length;
    return offset;
  };

  const newViews = [];
  const accessorView = new Map();
  for (const index of [...usedAccessors].sort((a, b) => a - b)) {
    const acc = json.accessors[index];
    const swap = replacement.get(index);
    let bytes;
    if (swap) {
      bytes = swap.bytes; acc.componentType = swap.componentType; acc.normalized = swap.normalized;
    } else {
      const view = json.bufferViews[acc.bufferView];
      const size = COMPONENT_SIZE[acc.componentType] * COMPONENTS[acc.type];
      const stride = view.byteStride || size;
      const base = (view.byteOffset || 0) + (acc.byteOffset || 0);
      if (stride === size) bytes = Buffer.from(bin.subarray(base, base + acc.count * size));
      else { // نفكّ التشابك حتى يصير كل accessor في مقطع مستقل
        bytes = Buffer.alloc(acc.count * size);
        for (let i = 0; i < acc.count; i++) bin.copy(bytes, i * size, base + i * stride, base + i * stride + size);
      }
    }
    const target = json.bufferViews[acc.bufferView]?.target;
    accessorView.set(index, newViews.length);
    newViews.push({ buffer: 0, byteOffset: push(bytes), byteLength: bytes.length, ...(target ? { target } : {}) });
    acc.byteOffset = 0;
  }

  // الصور تُكتب كـ data URI بدل bufferView: GLTFLoader وقتها يحمّلها عبر <img>
  // بدل ما يصنع blob URL — وسياسة CSP في صفحات Artifact تسمح بـ data: فقط.
  for (const image of json.images || []) {
    if (!image.__bytes) continue;
    image.uri = 'data:image/jpeg;base64,' + image.__bytes.toString('base64');
    delete image.bufferView;
    delete image.__bytes;
  }

  for (const index of usedAccessors) json.accessors[index].bufferView = accessorView.get(index);
  json.bufferViews = newViews;
  const newBin = Buffer.concat(chunks, cursor);
  json.buffers = [{ byteLength: newBin.length }];

  const out = writeGLB(json, newBin);
  return { out, dropped: [...new Set(dropped)], textureBefore, textureAfter };
}

// ---------------------------------------------------------------- تشغيل
mkdirSync(resolve(root, 'build/models'), { recursive: true });
mkdirSync(resolve(root, 'build/audio'), { recursive: true });

let before = 0, after = 0;
for (const file of readdirSync(resolve(root, 'public/models')).filter((f) => f.endsWith('.glb'))) {
  const name = file.replace(/\.glb$/, '');
  let source = readFileSync(resolve(root, 'public/models', file));
  let simplifyNote = '';
  try {
    const { out, before: triBefore, after: triAfter } = await simplifyGeometry(source, name);
    source = out;
    if (triAfter !== triBefore) simplifyNote = `  tris ${triBefore}->${triAfter}`;
  } catch (e) { console.warn(`  ! simplify skipped for ${file}: ${e.message}`); }
  const { out, dropped, textureBefore, textureAfter } = await optimizeGLB(source, file);
  writeFileSync(resolve(root, 'build/models', file), out);
  before += source.length; after += out.length;
  console.log(`${file.padEnd(17)} ${KB(source.length).padStart(6)} -> ${KB(out.length).padStart(6)}  textures ${KB(textureBefore)}->${KB(textureAfter)}${dropped.length ? `  dropped ${dropped.join(',')}` : ''}${simplifyNote}`);
}
for (const file of readdirSync(resolve(root, 'public/models')).filter((f) => f === 'manifest.json')) {
  writeFileSync(resolve(root, 'build/models', file), readFileSync(resolve(root, 'public/models', file)));
}

let audioBefore = 0, audioAfter = 0;
for (const file of readdirSync(resolve(root, 'public/audio')).filter((f) => f.endsWith('.mp3'))) {
  const from = resolve(root, 'public/audio', file), to = resolve(root, 'build/audio', file);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', from, '-ac', '1', '-ar', '24000', '-b:a', '40k', to]);
  audioBefore += statSync(from).size; audioAfter += statSync(to).size;
}
console.log(`\nmodels ${KB(before)} -> ${KB(after)}`);
console.log(`audio  ${KB(audioBefore)} -> ${KB(audioAfter)}`);
