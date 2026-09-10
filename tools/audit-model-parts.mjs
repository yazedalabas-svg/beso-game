// Prints the node hierarchy of one or more GLB files without dumping embedded images.
// Useful when an asset pack contains several props that should be placed separately.
import {readFileSync} from 'node:fs';

function parseGLB(path){
 const buffer=readFileSync(path);
 if(buffer.readUInt32LE(0)!==0x46546c67)throw new Error(`${path}: not a GLB`);
 const jsonLength=buffer.readUInt32LE(12);
 return JSON.parse(buffer.subarray(20,20+jsonLength).toString('utf8'));
}

function vec(value,fallback){
 return (value||fallback).map(n=>Number(n.toFixed?.(3)??n)).join(',');
}

for(const path of process.argv.slice(2)){
 const gltf=parseGLB(path),roots=gltf.scenes[gltf.scene??0].nodes||[];
 console.log(`\n${path} — ${gltf.nodes?.length||0} nodes, ${gltf.meshes?.length||0} meshes`);
 const print=(index,depth=0)=>{
  const node=gltf.nodes[index],mesh=node.mesh==null?'':` mesh=${node.mesh}`;
  console.log(`${'  '.repeat(depth)}[${index}] ${node.name||'(unnamed)'}${mesh} t=[${vec(node.translation,[0,0,0])}] r=[${vec(node.rotation,[0,0,0,1])}] s=[${vec(node.scale,[1,1,1])}]`);
  for(const child of node.children||[])print(child,depth+1);
 };
 for(const root of roots)print(root);
}
