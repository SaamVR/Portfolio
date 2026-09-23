import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#webgl');
const sections = [...document.querySelectorAll('[data-scene]')];
const runtimeState = document.querySelector('#runtimeState');
const railNumber = document.querySelector('#railNumber');
const railLabel = document.querySelector('#railLabel');
const railProgress = document.querySelector('#railProgress');
const timelineNeedle = document.querySelector('#timelineNeedle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const orientationMode = new URLSearchParams(location.search).get('orientation') || 'negx';
const orientationX = orientationMode === 'posx' ? Math.PI / 2 : orientationMode === 'raw' ? 0 : -Math.PI / 2;
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let activeScene = 'hero';
let activeProgress = 0;
let modelReady = false;
let clipDuration = 27.70833;
const HERO_ANIMATION_PROGRESS = 0.50;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = false;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, 0, 6);
scene.add(camera);

const presentation = new THREE.Group();
const centerGroup = new THREE.Group();
presentation.add(centerGroup);
scene.add(presentation);

const hemi = new THREE.HemisphereLight(0xfff7ec, 0x332820, 2.0);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff0dc, 4.3);
key.position.set(3.6, 4.2, 5.5);
scene.add(key);
const fill = new THREE.DirectionalLight(0x94a5b8, 1.4);
fill.position.set(-4, 0.5, 3);
scene.add(fill);
const rim = new THREE.PointLight(0xd47f49, 8.0, 12, 1.5);
rim.position.set(-3.2, 1.7, -1.8);
scene.add(rim);
const warm = new THREE.PointLight(0xffd2aa, 4.8, 10, 1.7);
warm.position.set(2.4, -1.6, 2.4);
scene.add(warm);

let model = null;
let mixer = null;
let clip = null;
let normalization = 1;
let primaryProductBounds = null;
let skeletonHelper = null;

const ease = t => t * t * (3 - 2 * t);
const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a,b,t) => a + (b-a) * t;
const lerp3 = (a,b,t) => [lerp(a[0],b[0],t), lerp(a[1],b[1],t), lerp(a[2],b[2],t)];

function sceneProgress(section){
  const r = section.getBoundingClientRect();
  const vh = innerHeight || 1;
  return clamp01((vh * 0.72 - r.top) / Math.max(1, r.height - vh * 0.36));
}

function resolveScene(){
  let best = sections[0];
  let bestDistance = Infinity;
  const focus = innerHeight * 0.48;
  for(const section of sections){
    const r = section.getBoundingClientRect();
    const center = (r.top + r.bottom) * 0.5;
    const d = Math.abs(center - focus);
    if(d < bestDistance){ bestDistance = d; best = section; }
  }
  activeScene = best.dataset.scene;
  activeProgress = sceneProgress(best);
  document.body.dataset.activeScene = activeScene;
  const index = sections.indexOf(best) + 1;
  railNumber.textContent = String(index).padStart(2,'0');
  railLabel.textContent = best.dataset.label || activeScene;
  railProgress.style.height = `${Math.round(activeProgress * 100)}%`;
  if(activeScene === 'mechanism') timelineNeedle.style.left = `${Math.round(activeProgress * 100)}%`;
}

function sampleAnimation(name, p){
  const e = ease(p);
  switch(name){
    case 'hero': return lerp(0.48, 0.52, e);
    case 'form': return lerp(0.34, 0.26, e);
    case 'mechanism': return lerp(0.24, 0.56, e);
    case 'choreography': return lerp(0.68, 0.82, e);
    case 'interaction': return lerp(0.64, 0.74, e);
    case 'closing': return lerp(0.74, 0.50, e);
    default: return 0.5;
  }
}

function sampleCamera(name, p){
  const e = ease(p);
  const mobile = innerWidth <= 700;
  const baseZ = mobile ? 7.0 : 5.65;
  switch(name){
    case 'hero':
      return {pos:lerp3([0,.06,baseZ],[.10,.04,baseZ-.16],e),look:[0,.04,0],fov:mobile?31:30,scale:mobile?.78:1.10,model:[0,mobile?.62:.08,0],yaw:0};
    case 'form':
      return {pos:lerp3([-.34,.04,baseZ-.42],[.26,.08,baseZ-.68],e),look:[0,.04,0],fov:31,scale:mobile?.78:1.20,model:[mobile?0:1.25,mobile?.50:.02,0],yaw:lerp(-.025,.03,e)};
    case 'mechanism':
      return {pos:lerp3([.36,.02,baseZ-.64],[-.40,.10,baseZ-.60],e),look:[0,.02,0],fov:30,scale:mobile?.73:1.04,model:[mobile?0:lerp(-1.85,-1.35,e),mobile?.58:-.04,0],yaw:lerp(.03,-.04,e)};
    case 'choreography':
      return {pos:lerp3([-.58,.10,baseZ-.72],[.62,-.02,baseZ-.92],e),look:[0,-.05,0],fov:29,scale:mobile?.82:1.28,model:[0,mobile?.28:-.48,0],yaw:lerp(-.04,.05,e)};
    case 'interaction':
      return {pos:lerp3([.28,.06,baseZ-.54],[-.15,.02,baseZ-.68],e),look:[0,.02,0],fov:30,scale:mobile?.78:1.14,model:[mobile?0:1.35,mobile?.48:.08,0],yaw:0};
    case 'closing':
      return {pos:lerp3([0,.05,baseZ-.02],[0,.06,baseZ+.16],e),look:[0,.02,0],fov:31,scale:mobile?.56:.72,model:[mobile?.58:1.65,mobile?-.12:-.35,0],yaw:lerp(-.08,.05,e)};
    default:
      return {pos:[0,0,baseZ],look:[0,0,0],fov:31,scale:1,model:[0,0,0],yaw:0};
  }
}

function sampleLighting(name){
  if(name === 'choreography') return {exposure:1.22, hemi:1.05, key:5.4, fill:.55, rim:12.5, warm:6.5, keyColor:0xffd0a2, rimColor:0xb95c32};
  if(name === 'interaction') return {exposure:1.08, hemi:2.1, key:4.8, fill:1.1, rim:9.0, warm:5.1, keyColor:0xffedd9, rimColor:0xb86c40};
  if(name === 'closing') return {exposure:1.14, hemi:1.0, key:4.5, fill:.7, rim:9.5, warm:4.0, keyColor:0xffe5cf, rimColor:0xb86c40};
  return {exposure:1.08, hemi:2.0, key:4.3, fill:1.4, rim:7.5, warm:4.8, keyColor:0xfff0dc, rimColor:0xd47f49};
}

function applyTextureQuality(root){
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  root.traverse(obj => {
    if(!obj.isMesh) return;
    obj.frustumCulled = true;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for(const mat of materials){
      if(!mat) continue;
      mat.side = THREE.DoubleSide;
      for(const keyName of ['map','normalMap','aoMap','roughnessMap','metalnessMap','emissiveMap']){
        const tex = mat[keyName];
        if(tex){ tex.anisotropy = Math.min(maxAniso, 8); tex.needsUpdate = true; }
      }
      if(mat.normalScale) mat.normalScale.multiplyScalar(.8);
      mat.needsUpdate = true;
    }
  });
}

function computePrimaryBounds(root){
  // Circle.013 is a ~16-unit cable. It renders, but must not decide camera scale or centering.
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const childBox = new THREE.Box3();
  root.traverse(obj => {
    if(!obj.isMesh || obj.name === 'Circle013_0' || obj.name === 'Circle.013_0') return;
    childBox.makeEmpty();
    childBox.setFromObject(obj, true);
    if(!childBox.isEmpty()) box.union(childBox);
  });
  return box;
}

function loadModel(){
  const loader = new GLTFLoader();
  loader.load('./assets/headphones-web.gltf', gltf => {
    model = gltf.scene;
    applyTextureQuality(model);
    centerGroup.add(model);

    clip = [...gltf.animations].sort((a,b) => b.duration - a.duration)[0] || null;
    if(clip){
      clipDuration = clip.duration || clipDuration;
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(clip);
      action.play();
      mixer.setTime(clipDuration * HERO_ANIMATION_PROGRESS);
      model.updateMatrixWorld(true);
    }

    const cable = model.getObjectByName('Circle013_0') || model.getObjectByName('Circle.013_0');
    if(cable) cable.visible = false;

    skeletonHelper = new THREE.SkeletonHelper(model);
    skeletonHelper.material.color.setHex(0xb8794d);
    skeletonHelper.material.transparent = true;
    skeletonHelper.material.opacity = 0;
    skeletonHelper.material.depthTest = false;
    skeletonHelper.renderOrder = 5;
    scene.add(skeletonHelper);

    primaryProductBounds = computePrimaryBounds(model);
    const size = primaryProductBounds.getSize(new THREE.Vector3());
    const center = primaryProductBounds.getCenter(new THREE.Vector3());
    centerGroup.position.copy(center).multiplyScalar(-1);
    const major = Math.max(size.x, size.y, size.z, 1);
    normalization = 3.55 / major;
    presentation.scale.setScalar(normalization);
    model.updateMatrixWorld(true);

    modelReady = true;
    document.body.dataset.modelState = 'ready';
    runtimeState.textContent = `${clip?.name || 'GLTF'} / ${clipDuration.toFixed(2)} SEC / LIVE`;
  }, xhr => {
    if(xhr.total) runtimeState.textContent = `LOADING ORIGINAL GLTF / ${Math.round(xhr.loaded/xhr.total*100)}%`;
  }, error => {
    document.body.dataset.modelState = 'error';
    runtimeState.textContent = 'MODEL LOAD ERROR';
    console.error('NOVA GLTF load failed', error);
  });
}

function resize(){
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 700 ? 1.35 : 1.6));
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  resolveScene();
}

function render(){
  resolveScene();
  const p = reducedMotion ? .45 : activeProgress;
  const cam = sampleCamera(activeScene, p);
  const lighting = sampleLighting(activeScene, p);
  const targetTime = sampleAnimation(activeScene, p) * clipDuration;
  if(modelReady && mixer) mixer.setTime(targetTime);
  if(skeletonHelper){
    const mechanismPulse = activeScene === 'mechanism' ? Math.max(0, 1 - Math.abs(p - .5) * 1.7) : 0;
    skeletonHelper.material.opacity = THREE.MathUtils.damp(skeletonHelper.material.opacity, mechanismPulse * .20, 5.0, 1/60);
    skeletonHelper.visible = skeletonHelper.material.opacity > .008;
  }

  pointer.x = THREE.MathUtils.damp(pointer.x, pointer.tx, 5.5, 1/60);
  pointer.y = THREE.MathUtils.damp(pointer.y, pointer.ty, 5.5, 1/60);
  const live = activeScene === 'interaction' && !reducedMotion ? 1 : 0;
  const camX = cam.pos[0] + pointer.x * .13 * live;
  const camY = cam.pos[1] - pointer.y * .08 * live;
  camera.position.x = THREE.MathUtils.damp(camera.position.x, camX, 4.0, 1/60);
  camera.position.y = THREE.MathUtils.damp(camera.position.y, camY, 4.0, 1/60);
  camera.position.z = THREE.MathUtils.damp(camera.position.z, cam.pos[2], 4.0, 1/60);
  camera.fov = THREE.MathUtils.damp(camera.fov, cam.fov, 4.0, 1/60);
  camera.updateProjectionMatrix();
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);

  presentation.position.x = THREE.MathUtils.damp(presentation.position.x, cam.model[0], 4.2, 1/60);
  presentation.position.y = THREE.MathUtils.damp(presentation.position.y, cam.model[1], 4.2, 1/60);
  presentation.position.z = THREE.MathUtils.damp(presentation.position.z, cam.model[2], 4.2, 1/60);
  presentation.rotation.x = THREE.MathUtils.damp(presentation.rotation.x, orientationX, 5.2, 1/60);
  presentation.rotation.y = THREE.MathUtils.damp(presentation.rotation.y, cam.yaw + pointer.x * .015 * live, 4.2, 1/60);
  const s = normalization * cam.scale;
  presentation.scale.x = THREE.MathUtils.damp(presentation.scale.x, s, 4.2, 1/60);
  presentation.scale.y = THREE.MathUtils.damp(presentation.scale.y, s, 4.2, 1/60);
  presentation.scale.z = THREE.MathUtils.damp(presentation.scale.z, s, 4.2, 1/60);

  renderer.toneMappingExposure = THREE.MathUtils.damp(renderer.toneMappingExposure, lighting.exposure, 3.5, 1/60);
  hemi.intensity = THREE.MathUtils.damp(hemi.intensity, lighting.hemi, 3.5, 1/60);
  key.intensity = THREE.MathUtils.damp(key.intensity, lighting.key, 3.5, 1/60);
  fill.intensity = THREE.MathUtils.damp(fill.intensity, lighting.fill, 3.5, 1/60);
  rim.intensity = THREE.MathUtils.damp(rim.intensity, lighting.rim, 3.5, 1/60);
  warm.intensity = THREE.MathUtils.damp(warm.intensity, lighting.warm, 3.5, 1/60);
  key.color.setHex(lighting.keyColor);
  rim.color.setHex(lighting.rimColor);
  key.position.x = THREE.MathUtils.damp(key.position.x, 3.6 + pointer.x * 2.0 * live, 4.5, 1/60);
  key.position.y = THREE.MathUtils.damp(key.position.y, 4.2 - pointer.y * 1.4 * live, 4.5, 1/60);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

window.addEventListener('pointermove', e => {
  pointer.tx = (e.clientX / innerWidth - .5) * 2;
  pointer.ty = (e.clientY / innerHeight - .5) * 2;
}, {passive:true});
window.addEventListener('resize', resize, {passive:true});
window.addEventListener('scroll', resolveScene, {passive:true});
document.querySelector('#replay').addEventListener('click', () => scrollTo({top:0,behavior:reducedMotion?'auto':'smooth'}));

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if(entry.isIntersecting) entry.target.classList.add('is-visible');
}), {threshold:.12});
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

resize();
loadModel();
render();
