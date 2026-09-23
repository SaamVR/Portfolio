import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getGlobalProgress, getRangeState, sampleTimeline } from './runtime/timeline.js';
import { createInteractionState, composeVisualState } from './runtime/composer.js';
import { createRenderAdapter } from './runtime/render-adapter.js';

const canvas = document.querySelector('#webgl');
const runtimeState = document.querySelector('#runtimeState');
const progressEl = document.querySelector('#experienceProgress');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const query = new URLSearchParams(location.search);
const orientationMode = query.get('orientation') || 'negx';
const orientationX = orientationMode === 'posx' ? Math.PI / 2 : orientationMode === 'raw' ? 0 : -Math.PI / 2;
const poseOverrideRaw = query.get('pose');
const poseOverride = poseOverrideRaw === null ? null : Math.max(0, Math.min(1, Number(poseOverrideRaw)));
const pointer = {x:0,y:0,tx:0,ty:0};
const interactionState = createInteractionState();

const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 700 ? 1.35 : 1.6));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=false;
renderer.setClearColor(0x000000,0);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(30,innerWidth/innerHeight,.01,100);
camera.position.set(0,0,5.5);
scene.add(camera);

const normalizationRoot=new THREE.Group();
const presentation=new THREE.Group();
const centerGroup=new THREE.Group();
presentation.add(centerGroup);
normalizationRoot.add(presentation);
scene.add(normalizationRoot);

const hemi=new THREE.HemisphereLight(0xfff7ec,0x332820,2);
scene.add(hemi);
const key=new THREE.DirectionalLight(0xfff0dc,4.3);
key.position.set(3.6,4.2,5.5);
scene.add(key);
const fill=new THREE.DirectionalLight(0x94a5b8,1.4);
fill.position.set(-4,.5,3);
scene.add(fill);
const rim=new THREE.PointLight(0xd47f49,8,12,1.5);
rim.position.set(-3.2,1.7,-1.8);
scene.add(rim);
const warm=new THREE.PointLight(0xffd2aa,4.8,10,1.7);
warm.position.set(2.4,-1.6,2.4);
scene.add(warm);
const lights={hemi,key,fill,rim,warm};

let model=null;
let mixer=null;
let clip=null;
let clipDuration=27.70833;
let primaryProductBounds=null;
let adapter=createRenderAdapter({
  THREE,camera,presentation,mixer:null,clipDuration,renderer,lights,environment:null,orientationX
});
let lastTime=performance.now();

const REDUCED_SETTLED={
  hero:.10,design:.20,spatial:.36,adaptive:.52,form:.65,inspect:.79,resolution:.92,behind:.985
};

function viewportClass(){
  return innerWidth <= 700 ? 'mobile' : innerWidth <= 1100 ? 'tablet' : 'desktop';
}

function currentProgress(){
  return getGlobalProgress(scrollY,document.documentElement.scrollHeight,innerHeight);
}

function applyTextureQuality(root){
  const maxAniso=renderer.capabilities.getMaxAnisotropy();
  root.traverse(obj=>{
    if(!obj.isMesh) return;
    obj.frustumCulled=true;
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const mat of materials){
      if(!mat) continue;
      mat.side=THREE.DoubleSide;
      for(const keyName of ['map','normalMap','aoMap','roughnessMap','metalnessMap','emissiveMap']){
        const tex=mat[keyName];
        if(tex){tex.anisotropy=Math.min(maxAniso,8);tex.needsUpdate=true;}
      }
      if(mat.normalScale) mat.normalScale.multiplyScalar(.8);
      mat.needsUpdate=true;
    }
  });
}

function computePrimaryBounds(root){
  root.updateMatrixWorld(true);
  const box=new THREE.Box3();
  const childBox=new THREE.Box3();
  root.traverse(obj=>{
    if(!obj.isMesh || obj.name === 'Circle013_0' || obj.name === 'Circle.013_0') return;
    childBox.makeEmpty();
    childBox.setFromObject(obj,true);
    if(!childBox.isEmpty()) box.union(childBox);
  });
  return box;
}

function rebuildAdapter(){
  adapter=createRenderAdapter({
    THREE,camera,presentation,mixer,clipDuration,renderer,lights,environment:null,orientationX
  });
}

function loadModel(){
  const loader=new GLTFLoader();
  loader.load('./assets/headphones-web.gltf',gltf=>{
    model=gltf.scene;
    const cableMesh=model.getObjectByName('Circle.013_0');
    if(cableMesh) cableMesh.visible=false;
    applyTextureQuality(model);
    centerGroup.add(model);

    clip=[...gltf.animations].sort((a,b)=>b.duration-a.duration)[0] || null;
    if(clip){
      clipDuration=clip.duration || clipDuration;
      mixer=new THREE.AnimationMixer(model);
      const action=mixer.clipAction(clip);
      action.play();
      mixer.setTime(clipDuration*.24);
      model.updateMatrixWorld(true);
    }

    const cable=model.getObjectByName('Circle013_0') || model.getObjectByName('Circle.013_0');
    if(cable) cable.visible = false;

    primaryProductBounds=computePrimaryBounds(model);
    const size=primaryProductBounds.getSize(new THREE.Vector3());
    const center=primaryProductBounds.getCenter(new THREE.Vector3());
    centerGroup.position.copy(center).multiplyScalar(-1);
    const major=Math.max(size.x,size.y,size.z,1);
    normalizationRoot.scale.setScalar(3.55/major);
    model.updateMatrixWorld(true);

    rebuildAdapter();
    document.body.dataset.modelState='ready';
    if(runtimeState) runtimeState.textContent=`${clip?.name || 'GLTF'} / ${clipDuration.toFixed(2)} SEC / LIVE`;
  },xhr=>{
    if(xhr.total && runtimeState) runtimeState.textContent=`LOADING NOVA / ${Math.round(xhr.loaded/xhr.total*100)}%`;
  },error=>{
    document.body.dataset.modelState='error';
    if(runtimeState) runtimeState.textContent='3D MODEL UNAVAILABLE';
    console.error('NOVA GLTF load failed',error);
  });
}

function resize(){
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,innerWidth<=700?1.35:1.6));
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
}

function sampleAuthoredState(){
  const progress=currentProgress();
  const range=getRangeState(progress);
  const authoredProgress=reducedMotion ? REDUCED_SETTLED[range.range] ?? progress : progress;
  const state=sampleTimeline(authoredProgress,viewportClass());
  state.progress=progress;
  state.range=range.range;
  state.rangeProgress=range.progress;
  state.ui.range=range.range;
  state.ui.settled=reducedMotion || state.ui.settled;
  if(poseOverride !== null) state.product.pose=poseOverride;
  return state;
}

function publishState(state){
  document.body.dataset.range=state.range;
  document.body.dataset.rangeProgress=state.rangeProgress.toFixed(4);
  document.body.dataset.settled=String(Boolean(state.ui.settled));
  document.body.dataset.activeScene=state.range;
  if(progressEl) progressEl.style.width=`${Math.round(state.progress*100)}%`;
}

function render(now=performance.now()){
  const dt=Math.min(.05,Math.max(.001,(now-lastTime)/1000 || 1/60));
  lastTime=now;

  pointer.x=THREE.MathUtils.damp(pointer.x,pointer.tx,6,dt);
  pointer.y=THREE.MathUtils.damp(pointer.y,pointer.ty,6,dt);
  interactionState.pointer={
    x:pointer.x,
    y:pointer.y,
    weight:reducedMotion ? 0 : .16
  };

  const base=sampleAuthoredState();
  const composed=composeVisualState(base,interactionState);
  publishState(composed);
  adapter.apply(composed,dt);
  renderer.render(scene,camera);
  requestAnimationFrame(render);
}

window.addEventListener('pointermove',event=>{
  pointer.tx=(event.clientX/Math.max(1,innerWidth)-.5)*2;
  pointer.ty=(event.clientY/Math.max(1,innerHeight)-.5)*2;
},{passive:true});
window.addEventListener('resize',resize,{passive:true});
document.querySelector('#replay')?.addEventListener('click',()=>scrollTo({top:0,behavior:reducedMotion?'auto':'smooth'}));

resize();
loadModel();
requestAnimationFrame(render);
