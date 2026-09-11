// يبسّط هندسة الموديلات الثقيلة قبل أن يدخلها tools/optimize-assets.mjs (ضغط الخامات).
// مصدرها مولّدة آليًا (Tripo/Meshy) بدون فهرسة أو تبسيط، فبعضها بعشرات آلاف الرؤوس
// لقطعة ديكور صغيرة. نفعّل weld+simplify+quantize عبر @gltf-transform (يتعامل صح مع
// أوزان الجلد Skinning)، مع استثناء التبسيط عن الشخصيات المتحركة (marzooq, bat) — نكتفي
// بالتصغير الكمّي (quantize) لهم فقط.
import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, simplify, quantize, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

await MeshoptSimplifier.ready;

const io = new NodeIO().registerExtensions([KHRMeshQuantization]);

// بعض الملفات المصدرة (Tripo/Meshy) فيها accessor يشير لـ bufferView غير موجود أصلاً
// (رقم فهرس أكبر من طول المصفوفة — مثلاً TEXCOORD_1 يتيم من تصدير ناقص)، أو بلا bufferView
// إطلاقًا. قارئ gltf-transform يحاول يقرأ كل accessor حتى اليتيم منها وينهار حينها.
// نعيد أي مرجع تالف إلى bufferView[0] (غير ضار لأنه غير مستخدم أصلاً) — prune() يشيله بعدين.
function patchOrphanAccessors(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) return buffer;
  const jsonLength = view.getUint32(12, true);
  const jsonBytes = buffer.subarray(20, 20 + jsonLength);
  const json = JSON.parse(jsonBytes.toString('utf8'));
  const viewCount = (json.bufferViews || []).length;

  // لا نلمس إلا accessor غير مُشار إليه من أي primitive/skin/animation — لو accessor
  // مستخدم فعليًا وفيه مرجع تالف فهذا عطل حقيقي غير هذا؛ نتركه يفشل بدل ما نصلح بصمت.
  const used = new Set();
  for (const mesh of json.meshes || []) for (const prim of mesh.primitives) {
    for (const idx of Object.values(prim.attributes)) used.add(idx);
    if (prim.indices != null) used.add(prim.indices);
    for (const target of prim.targets || []) for (const idx of Object.values(target)) used.add(idx);
  }
  for (const skin of json.skins || []) if (skin.inverseBindMatrices != null) used.add(skin.inverseBindMatrices);
  for (const animation of json.animations || []) for (const sampler of animation.samplers) { used.add(sampler.input); used.add(sampler.output); }

  let patched = false;
  json.accessors ||= [];
  json.accessors.forEach((acc, i) => {
    if (used.has(i)) return;
    const invalid = acc.bufferView != null && (acc.bufferView < 0 || acc.bufferView >= viewCount);
    if ((acc.bufferView == null || invalid) && !acc.sparse) { acc.bufferView = 0; acc.byteOffset = 0; patched = true; }
  });
  if (!patched) return buffer;
  const newJson = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (newJson.length % 4)) % 4;
  const newJsonPadded = Buffer.concat([newJson, Buffer.alloc(pad, 0x20)]);
  const rest = buffer.subarray(20 + jsonLength);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + newJsonPadded.length + rest.length, 8);
  header.writeUInt32LE(newJsonPadded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, newJsonPadded, rest]);
}

// الاسم -> نسبة المضلعات المستهدفة بعد التبسيط (0.2 = الإبقاء على ٢٠٪ فقط)
// الحزمة النهائية بعيدة جدًا عن حد الـ16MB (وصلت ~8.6MB)، فرفعنا هذي النسب بعد ما بان
// إن عدة موديلات بلا خامة صور (لوكر، مونيتور...) فقدت تفاصيلها الهندسية الوحيدة عند
// التبسيط العنيف الأول — التفاصيل بهذي الملفات هندسة صرفة، مو نسيج، فلازم نبقي منها أكثر.
const SIMPLIFY_RATIO = {
  mushroom: 0.35, mouse: 0.4, monitor: 0.45, filing: 0.4, fan: 0.4,
  locker: 0.55, backpack: 0.45, bed: 0.5, warnings: 0.45, breaker: 0.45,
  energy: 0.4, battery: 0.45, camera: 0.55, boxes: 0.6,
};
const SKINNED = new Set(['marzooq', 'bat']);

export async function simplifyGeometry(buffer, name) {
  const clean = patchOrphanAccessors(buffer);
  const document = await io.readBinary(new Uint8Array(clean));
  const before = countTriangles(document);

  if (!SKINNED.has(name)) {
    const ratio = SIMPLIFY_RATIO[name];
    if (ratio) {
      await document.transform(
        weld({ tolerance: 0.0003 }),
        simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }),
      );
    }
  }
  await document.transform(dedup(), quantize(), prune());

  const after = countTriangles(document);
  const out = Buffer.from(await io.writeBinary(document));
  return { out, before, after };
}

function countTriangles(document) {
  let tris = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const position = prim.getAttribute('POSITION');
      tris += (indices ? indices.getCount() : position ? position.getCount() : 0) / 3;
    }
  }
  return Math.round(tris);
}
