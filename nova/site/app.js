import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getGlobalProgress, getRangeState, sampleTimeline } from './runtime/timeline.js';
import { createInteractionState, composeVisualState } from './runtime/composer.js';
import { createRenderAdapter } from './runtime/render-adapter.js';
import { createEnvironment } from './runtime/environment.js';
import { bindProductUI, updateProductUI, set3dAvailability } from './ui/product-ui.js';
import { createFoldController } from './interactions/fold-controller.js';
import { createInspectionController } from './interactions/inspection-controller.js';
import { createHotspotController } from './interactions/hotspot-controller.js';
import { createModeController } from './interactions/mode-controller.js';

const canvas = document.querySelector('#webgl');
const runtimeState = document.querySelector('#runtimeState');
const progressEl = document.querySelector('#experienceProgress');
const hotspotElements = Object.fromEntries(
  [...document.querySelectorAll('[data-hotspot]')].map(el => [el.dataset.hotspot, el])
);
const rangeStages=[...document.querySelectorAll('[data-range-anchor]')];
const behindStageEl=document.querySelector('#behind');
const caseStudyEl=document.querySelector('#case-study');
let publishedRange=null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const query = new URLSearchParams(location.search);
const orientationMode = query.get('orientation') || 'negx';
const orientationX = orientationMode === 'posx' ? Math.PI / 2 : orientationMode === 'raw' ? 0 : -Math.PI / 2;
const poseOverrideRaw = query.get('pose');
const poseOverride = poseOverrideRaw === null ? null : Math.max(0, Math.min(1, Number(poseOverrideRaw)));
const forceStatic = query.get('static') === '1';

const pointer = {x:0,y:0,tx:0,ty:0};
const interactionState = createInteractionState();
const foldController = createFoldController({openPose:.28,foldedPose:.40,duration:.88});
const inspectionController = createInspectionController({maxYaw:.52,maxPitch:.12});
const modeController = createModeController();

let hotspotController = null;
let currentComposedState = null;
let listeningMode = 'spatial';
let noiseMode = 'adaptive';
let foldState = 'open';
let inspectionView = 'front';
let scrollActivityUntil = 0;

let renderer=null;
let rendererAvailable=false;
try{
  if(forceStatic) throw new Error('forced static fallback');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 700 ? 1.35 : 1.6));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=false;
  renderer.setClearColor(0x000000,0);
  rendererAvailable=true;
  document.body.dataset.threeDAvailable='true';
}catch(error){
  rendererAvailable=false;
  document.body.dataset.modelState='fallback';
  document.body.dataset.threeDAvailable='false';
  canvas.hidden=true;
  set3dAvailability(false);
  if(runtimeState) runtimeState.textContent='STATIC MODE / 3D UNAVAILABLE';
  console.warn('QC Ultra visualization WebGL renderer unavailable; continuing with static product experience.',error);
}

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
const environment=createEnvironment(scene,THREE);

let model=null;
let mixer=null;
let clip=null;
let clipDuration=27.70833;
let primaryProductBounds=null;
let adapter=rendererAvailable?createRenderAdapter({
  THREE,camera,presentation,mixer:null,clipDuration,renderer,lights,environment,orientationX
}):null;
let lastTime=performance.now();

const REDUCED_SETTLED={
  hero:.10,design:.20,spatial:.36,adaptive:.52,form:.65,inspect:.79,resolution:.92,behind:.985
};

function viewportClass(){
  return innerWidth <= 700 ? 'mobile' : innerWidth <= 1100 ? 'tablet' : 'desktop';
}

function cinematicTrackHeight(){
  const stageBottom=(behindStageEl?.offsetTop||0)+(behindStageEl?.offsetHeight||0);
  return Math.max(innerHeight+1,stageBottom);
}

function currentProgress(){
  return getGlobalProgress(scrollY,cinematicTrackHeight(),innerHeight);
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

function buildHotspotController(size){
  const hx=size.x*.5;
  const hy=size.y*.5;
  const hz=size.z*.5;
  const resolveModelObject=name=>{
    if(!model) return null;
    return model.getObjectByName(name) || model.getObjectByName(name.replaceAll('.', '')) || null;
  };
  const bone=(name,fallbackPoint)=>({
    object:resolveModelObject(name),
    point:fallbackPoint
  });
  const skinnedSurface=(name,vertexIndex,fallbackPoint)=>{
    const object=resolveModelObject(name);
    const mesh=object?.isSkinnedMesh
      ? object
      : object?.children?.find(child=>child.isSkinnedMesh) || null;
    return {mesh,vertexIndex,point:fallbackPoint};
  };

  const cushion=skinnedSurface('Circle.012_0',275,[hx*.60,-hy*.10,hz*.28]);
  const headband=bone('Bone_R.009_Armature',[0,hy*.70,0]);
  const controls=skinnedSurface('Circle.009_0',275,[-hx*.62,-hy*.06,hz*.22]);

  hotspotController=createHotspotController({
    THREE,
    camera,
    elements:hotspotElements,
    anchors:{
      cushion:{
        ...cushion,
        cameraOffset:[.12,-.02,-.16],
        targetOffset:[.10,-.03,0]
      },
      headband:{
        ...headband,
        offset:[-.12,-.12,0],
        cameraOffset:[-.08,.12,-.10],
        targetOffset:[0,.11,0]
      },
      controls:{
        ...controls,
        cameraOffset:[-.12,-.01,-.16],
        targetOffset:[-.10,-.02,0]
      }
    }
  });
}

function hideHotspots(){
  for(const el of Object.values(hotspotElements)) el.dataset.visible='false';
}

function rebuildAdapter(){
  if(!rendererAvailable) return;
  adapter=createRenderAdapter({
    THREE,camera,presentation,mixer,clipDuration,renderer,lights,environment,orientationX
  });
}

function loadModel(){
  if(!rendererAvailable){
    hideHotspots();
    set3dAvailability(false);
    return;
  }
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

    buildHotspotController(size);
    rebuildAdapter();
    document.body.dataset.modelState='ready';
    set3dAvailability(true);
    if(runtimeState) runtimeState.textContent=`${clip?.name || 'GLTF'} / ${clipDuration.toFixed(2)} SEC / LIVE`;
  },xhr=>{
    if(xhr.total && runtimeState) runtimeState.textContent=`LOADING QC ULTRA / ${Math.round(xhr.loaded/xhr.total*100)}%`;
  },error=>{
    document.body.dataset.modelState='error';
    set3dAvailability(false);
    hideHotspots();
    if(runtimeState) runtimeState.textContent='3D MODEL UNAVAILABLE';
    console.error('QC Ultra visualization GLTF load failed',error);
  });
}

function resize(){
  if(rendererAvailable){
    renderer.setSize(innerWidth,innerHeight,false);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,innerWidth<=700?1.35:1.6));
  }
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  environment.resize(innerWidth,innerHeight);
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
  const caseStudyActive=Boolean(caseStudyEl && scrollY>=Math.max(0,caseStudyEl.offsetTop-innerHeight*.18));
  document.body.dataset.caseStudy=String(caseStudyActive);
  document.body.dataset.range=state.range;
  document.body.dataset.rangeProgress=state.rangeProgress.toFixed(4);
  document.body.dataset.settled=String(Boolean(state.ui.settled));
  document.body.dataset.activeScene=state.range;
  document.body.dataset.transition=state.ui.transition || 'none';
  document.body.dataset.stageGating='true';
  if(publishedRange!==state.range){
    for(const stage of rangeStages) stage.classList.toggle('is-active',stage.dataset.rangeAnchor===state.range);
    publishedRange=state.range;
  }
  if(progressEl) progressEl.style.width=`${Math.round(state.progress*100)}%`;
  state.interaction={
    listeningMode,
    noiseMode,
    foldState,
    inspectionView:interactionState.inspection?.view || inspectionView
  };
  updateProductUI(state);
}

function updateInteractionInfluences(base,dt,now){
  inspectionController.setActive(base.range==='inspect');
  inspectionController.update(dt);
  modeController.update(dt);

  const foldInfluenceBefore=foldController.getInfluence();
  foldController.update(dt,{
    scrollActive:foldInfluenceBefore.active && now < scrollActivityUntil,
    timelinePose:base.product.pose
  });

  const modeInfluence=modeController.getInfluence();
  interactionState.fold=foldController.getInfluence();
  interactionState.inspection=inspectionController.getInfluence();
  interactionState.listening=base.range==='spatial'
    ? modeInfluence.listening
    : {mode:listeningMode,weight:0};
  interactionState.noise=base.range==='adaptive'
    ? modeInfluence.noise
    : {mode:noiseMode,weight:0};

  if(hotspotController && (base.range==='design' || base.range==='inspect')){
    centerGroup.updateWorldMatrix(true,false);
    hotspotController.update({
      modelRoot:centerGroup,
      viewport:{width:innerWidth,height:innerHeight},
      dt
    });
    interactionState.hotspot=hotspotController.getInfluence();
  }else{
    hideHotspots();
    interactionState.hotspot={weight:0,id:null,cameraOffset:[0,0,0],targetOffset:[0,0,0]};
  }

  pointer.x=THREE.MathUtils.damp(pointer.x,pointer.tx,6,dt);
  pointer.y=THREE.MathUtils.damp(pointer.y,pointer.ty,6,dt);
  interactionState.pointer={
    x:pointer.x,
    y:pointer.y,
    weight:reducedMotion || base.range==='inspect' ? 0 : .14
  };
}

function render(now=performance.now()){
  const dt=Math.min(.05,Math.max(.001,(now-lastTime)/1000 || 1/60));
  lastTime=now;

  const base=sampleAuthoredState();
  updateInteractionInfluences(base,dt,now);
  const composed=composeVisualState(base,interactionState);
  currentComposedState=composed;
  publishState(composed);
  if(rendererAvailable && adapter){
    adapter.apply(composed,dt);
    renderer.render(scene,camera);
  }
  requestAnimationFrame(render);
}

function scrollToProgress(progress){
  const max=Math.max(1,cinematicTrackHeight()-innerHeight);
  scrollTo({top:max*Math.max(0,Math.min(1,progress)),behavior:reducedMotion?'auto':'smooth'});
}

function scheduleTourDetail(callback){
  const delay=reducedMotion?80:620;
  window.setTimeout(callback,delay);
}

const actions={
  setListeningMode(mode){
    listeningMode=mode;
    modeController.setListening(mode);
  },
  setNoiseMode(mode){
    noiseMode=mode;
    modeController.setNoise(mode);
  },
  setFoldState(state){
    foldState=state;
    foldController.begin(state,currentComposedState?.product.pose ?? .24);
  },
  focusHotspot(id){
    hotspotController?.focus(id);
  },
  clearHotspot(){
    hotspotController?.clear();
  },
  setInspectionView(view){
    inspectionView=view;
    inspectionController.setView(view);
    hotspotController?.clear();
  },
  resetInspection(){
    inspectionView='front';
    inspectionController.reset();
    hotspotController?.clear();
  },
  tourTo(step){
    hotspotController?.clear();
    if(step==='comfort'){
      foldState='open';
      foldController.begin('open',currentComposedState?.product.pose ?? .24);
      inspectionView='front';
      inspectionController.reset();
      scrollToProgress(.20);
      if(rendererAvailable) scheduleTourDetail(()=>hotspotController?.focus('cushion'));
      return;
    }
    if(step==='fold'){
      inspectionView='front';
      inspectionController.reset();
      scrollToProgress(.65);
      if(rendererAvailable) scheduleTourDetail(()=>{
        foldState='fold';
        foldController.begin('fold',currentComposedState?.product.pose ?? .72);
      });
      return;
    }
    if(step==='controls'){
      foldState='open';
      foldController.begin('open',currentComposedState?.product.pose ?? .50);
      scrollToProgress(.79);
      if(rendererAvailable) scheduleTourDetail(()=>{
        inspectionView='side';
        inspectionController.setView('side');
        hotspotController?.focus('controls');
      });
    }
  },
  replay(){
    scrollTo({top:0,behavior:reducedMotion?'auto':'smooth'});
  }
};

bindProductUI(actions);
set3dAvailability(rendererAvailable);

window.addEventListener('pointermove',event=>{
  pointer.tx=(event.clientX/Math.max(1,innerWidth)-.5)*2;
  pointer.ty=(event.clientY/Math.max(1,innerHeight)-.5)*2;
},{passive:true});

window.addEventListener('scroll',()=>{
  scrollActivityUntil=performance.now()+180;
},{passive:true});

canvas.addEventListener('pointerdown',event=>{
  if(document.body.dataset.range!=='inspect') return;
  inspectionController.pointerDown(event.clientX,event.clientY,event.pointerId);
  try{
    canvas.setPointerCapture?.(event.pointerId);
  }catch{
    // Synthetic/mobile pointer sequences may not have an active native capture.
  }
  event.preventDefault();
});
canvas.addEventListener('pointermove',event=>{
  if(document.body.dataset.range!=='inspect') return;
  inspectionController.pointerMove(
    event.clientX,event.clientY,event.pointerId,
    {width:innerWidth,height:innerHeight}
  );
});
canvas.addEventListener('pointerup',event=>{
  inspectionController.pointerUp(event.pointerId);
  try{
    if(canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }catch{
    // Release is best-effort; controller state is already cleared above.
  }
});
canvas.addEventListener('pointercancel',event=>{
  inspectionController.pointerUp(event.pointerId);
});

window.addEventListener('resize',resize,{passive:true});

resize();
loadModel();
requestAnimationFrame(render);
