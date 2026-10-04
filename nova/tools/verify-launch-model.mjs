import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../site');
import * as THREE from '../site/vendor/three.module.js';
import {GLTFLoader} from '../site/vendor/addons/loaders/GLTFLoader.js';
import {sampleTimeline,EXPERIENCE_RANGES} from '../site/runtime/launch-timeline.js';
globalThis.ProgressEvent=class{constructor(type,args){Object.assign(this,args);}};
const file=path.join(site,'assets/headphones-web.gltf');
const source=JSON.parse(fs.readFileSync(file,'utf8'));
const imageMap=Object.fromEntries(source.materials.map(m=>[m.name,source.images[source.textures[m.pbrMetallicRoughness.baseColorTexture.index].source].uri]));
const data=structuredClone(source);
data.images=[];data.textures=[];
data.materials=data.materials.map(m=>({name:m.name,doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.5}}));
const gltf=await new GLTFLoader().parseAsync(JSON.stringify(data),'');
const root=gltf.scene,scene=new THREE.Scene(),normal=new THREE.Group(),presentation=new THREE.Group(),turn=new THREE.Group(),offset=new THREE.Group();
scene.add(normal);normal.add(presentation);presentation.add(turn);turn.add(offset);offset.add(root);
const mixer=new THREE.AnimationMixer(root),clip=[...gltf.animations].sort((a,b)=>b.duration-a.duration)[0];mixer.clipAction(clip).play();mixer.setTime(.72*clip.duration);
root.traverse(o=>{if(/Circle\.?013_0/.test(o.name))o.visible=false;});scene.updateMatrixWorld(true);
const bounds=new THREE.Box3();root.traverseVisible(o=>{if(o.isMesh&&o.visible)bounds.union(new THREE.Box3().setFromObject(o,true));});
const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());offset.position.copy(center).multiplyScalar(-1);normal.scale.setScalar(3.55/Math.max(size.x,size.y,size.z));
const meshes=[];root.traverseVisible(o=>{if(o.isMesh&&o.visible)meshes.push(o);});
console.log('Model open dimensions',size.toArray(),'clip duration',clip.duration,'meshes',meshes.length);
function setState(s,w,h){
 mixer.setTime(s.product.pose*clip.duration);presentation.rotation.set(-Math.PI/2+s.product.pitch,s.product.yaw,0);presentation.position.fromArray(s.product.position);presentation.scale.setScalar(s.product.scale);turn.rotation.set(s.product.inspectionPitch||0,0,s.product.inspectionYaw||0);
 scene.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton?.update());
 const camera=new THREE.PerspectiveCamera(s.camera.fov,w/h,.01,100);camera.position.fromArray(s.camera.position);camera.lookAt(...s.camera.target);camera.updateMatrixWorld(true);return camera;
}
const point=new THREE.Vector3();
const report=[];
for(const [viewport,w,h]of[['desktop',1440,900],['tablet',1024,768],['mobile',390,844],['mobile',375,667],['desktop',1440,700]]){
 for(const[range,[a,b]]of Object.entries(EXPERIENCE_RANGES)){
  const s=sampleTimeline((a+b)/2,viewport,{width:w,height:h}),camera=setState(s,w,h);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const mesh of meshes){for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld).project(camera);const x=(point.x+1)*w/2,y=(1-point.y)*h/2;minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}}
  report.push({viewport,w,h,range,box:[minX,minY,maxX,maxY].map(v=>Math.round(v))});
 }
}
for(const row of report){const [l,t,r,b]=row.box;assert.ok(l>=0&&r<=row.w&&t>=0&&b<=row.h,JSON.stringify(row));if(row.viewport==='mobile')assert.ok(b<row.h*.46,'Product must clear mobile copy: '+JSON.stringify(row));}
console.log('model-framing: PASS ('+report.length+' full skinned-mesh projections)');fs.writeFileSync('/tmp/nova-model-framing.json',JSON.stringify(report,null,2));
// A transparent poster rendered from the same skinned geometry, not a substitute model.
const posterState=sampleTimeline(.08);posterState.camera.target=[0,0,0];posterState.camera.position=[0,0,6.5];posterState.camera.fov=36;
const camera=setState(posterState,1200,1200),geometry=[];
for(const mesh of meshes){const vertices=[],uvs=[],normals=[],normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
 for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld).project(camera);vertices.push([(point.x+1)*600,(1-point.y)*600,point.z]);const uv=mesh.geometry.attributes.uv;uvs.push(uv?[uv.getX(i),uv.getY(i)]:[0,0]);const normal=mesh.geometry.attributes.normal;const v=new THREE.Vector3(normal.getX(i),normal.getY(i),normal.getZ(i)).applyMatrix3(normalMatrix).normalize();normals.push(v.toArray());}
 const indices=mesh.geometry.index?Array.from(mesh.geometry.index.array):vertices.map((_,i)=>i);
 geometry.push({name:mesh.name,vertices,uvs,normals,indices,texture:imageMap[mesh.material.name]});}
fs.writeFileSync('/tmp/nova-poster-geometry.json',JSON.stringify(geometry));
