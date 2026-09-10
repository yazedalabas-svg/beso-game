import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

globalThis.window ??= { innerWidth: 1920, innerHeight: 1080 };

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) throw new Error('usage: node tools/convert-model.mjs input output');

// The browser loader normally requests referenced textures while parsing FBX. For the
// lightweight maze props we keep the supplied geometry and apply one neutral material;
// this also makes the standalone build far smaller and more reliable.
THREE.TextureLoader.prototype.load = function load(_url, onLoad) {
  const texture = new THREE.Texture();
  queueMicrotask(() => onLoad?.(texture));
  return texture;
};

const input = resolve(inputArg);
const bytes = readFileSync(input);
const ext = extname(input).toLowerCase();
let object;
if (ext === '.fbx') {
  object = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), `${dirname(input)}/`);
} else if (ext === '.obj') {
  object = new OBJLoader().parse(bytes.toString('utf8'));
} else {
  throw new Error(`Unsupported input: ${ext}`);
}

const neutral = new THREE.MeshStandardMaterial({ color: 0x827b63, roughness: 0.82, metalness: 0.08 });
object.traverse((node) => {
  if (!node.isMesh) return;
  node.material = neutral;
  node.castShadow = false;
  node.receiveShadow = false;
});

class FileReaderPolyfill {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((value) => { this.result = value; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((value) => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
}
globalThis.FileReader ??= FileReaderPolyfill;

const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(object, { binary: true, onlyVisible: true, truncateDrawRange: true });
writeFileSync(resolve(outputArg), Buffer.from(glb));
console.log(`${inputArg} -> ${outputArg} (${Buffer.byteLength(glb)} bytes)`);
