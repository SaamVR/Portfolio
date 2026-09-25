import assert from 'node:assert/strict';
import {
  EXPERIENCE_RANGES,
  getGlobalProgress,
  getRangeState,
  sampleTimeline
} from '../site/runtime/timeline.js';
import { createInteractionState, composeVisualState } from '../site/runtime/composer.js';
import { createRenderAdapter } from '../site/runtime/render-adapter.js';

assert.deepEqual(EXPERIENCE_RANGES.hero, [0, 0.12]);
assert.equal(getGlobalProgress(0, 5000, 1000), 0);
assert.equal(getGlobalProgress(4000, 5000, 1000), 1);

for (const p of [0, .1199, .12, .1201, .2799, .28, .2801, .9599, .96, .9601, 1]) {
  const state = sampleTimeline(p, 'desktop');
  assert.equal(Number.isFinite(state.camera.fov), true);
  assert.equal(state.product.position.length, 3);
  assert.equal(state.camera.position.length, 3);
  assert.ok(state.range);
  assert.ok(state.rangeProgress >= 0 && state.rangeProgress <= 1);
}

for (const boundary of [.12, .28, .45, .58, .72, .86, .96]) {
  const a = sampleTimeline(boundary - 0.0001, 'desktop');
  const b = sampleTimeline(boundary + 0.0001, 'desktop');
  const delta = Math.hypot(
    a.camera.position[0] - b.camera.position[0],
    a.camera.position[1] - b.camera.position[1],
    a.camera.position[2] - b.camera.position[2]
  );
  assert.ok(delta < 0.08, `camera discontinuity at ${boundary}: ${delta}`);
}

const range = getRangeState(.30);
assert.equal(range.range, 'spatial');
assert.ok(range.progress >= 0 && range.progress <= 1);

const base = sampleTimeline(.65, 'desktop');
const interaction = createInteractionState();
interaction.fold = { weight:1, targetPose:.40, active:true };
interaction.inspection = { weight:1, yaw:.2, pitch:.05, active:true };
interaction.listening = { mode:'focus', weight:1 };

const composed = composeVisualState(base, interaction);
assert.equal(composed.product.pose, .40);
assert.equal(composed.camera.position[0], base.camera.position[0],
  'inspection fine-tune should keep camera framing centered');
assert.equal(composed.camera.position[1], base.camera.position[1],
  'inspection fine-tune should not vertically pan the camera');
assert.ok(Math.abs(composed.product.yaw-(base.product.yaw+.2))<1e-9,
  'inspection yaw should fine-tune product orientation');
assert.ok(Math.abs(composed.product.pitch-(base.product.pitch+.05))<1e-9,
  'inspection pitch should fine-tune product tilt');
assert.notEqual(composed.environment.spatialSpread, base.environment.spatialSpread);
assert.deepEqual(composed.product.position, base.product.position);

assert.equal(typeof createRenderAdapter, 'function');
for (const boundary of [.12,.28,.45,.58,.72,.86,.96]) {
  const a = sampleTimeline(boundary - .0001, 'desktop');
  const b = sampleTimeline(boundary + .0001, 'desktop');
  assert.ok(Math.abs(a.camera.fov-b.camera.fov) < .25);
  assert.ok(Math.abs(a.product.pose-b.product.pose) < .04);
  assert.ok(Math.abs(a.product.scale-b.product.scale) < .04);
  assert.ok(Math.hypot(...a.camera.target.map((v,i)=>v-b.camera.target[i])) < .08);
}

const vec=()=>({x:0,y:0,z:0});
const fakeThree={MathUtils:{damp:(current,target)=>target}};
const fakeCamera={position:vec(),fov:30,updateProjectionMatrix(){this.updated=true;},lookAt(...v){this.look=v;}};
const fakePresentation={position:vec(),rotation:vec(),scale:{x:1,y:1,z:1}};
let mixerTime=null;
const fakeMixer={setTime(v){mixerTime=v;}};
const fakeRenderer={toneMappingExposure:1};
const light=()=>({intensity:0,color:{value:null,setHex(v){this.value=v;}},position:vec()});
const lights={hemi:light(),key:light(),fill:light(),rim:light(),warm:light()};
let environmentState=null;
const environment={apply(v){environmentState=v;}};
const adapter=createRenderAdapter({THREE:fakeThree,camera:fakeCamera,presentation:fakePresentation,mixer:fakeMixer,clipDuration:10,renderer:fakeRenderer,lights,environment,orientationX:-Math.PI/2});
const rendered=sampleTimeline(.45,'desktop');
adapter.apply(rendered,.016);
assert.equal(mixerTime, rendered.product.pose*10);
assert.deepEqual(fakeCamera.look, rendered.camera.target);
assert.equal(lights.key.position.x, rendered.lighting.keyPosition[0]);
assert.equal(fakeRenderer.toneMappingExposure, rendered.lighting.exposure);
assert.equal(environmentState, rendered.environment);


const spatialDesktop=sampleTimeline(.36,'desktop');
assert.ok(
  spatialDesktop.camera.target[1] > -.30 && spatialDesktop.camera.target[1] < -.08,
  'Spatial camera should preserve copy separation without pushing the product beyond the top edge'
);
const adaptiveDesktop=sampleTimeline(.52,'desktop');
assert.ok(adaptiveDesktop.camera.target[0] > .38, 'Adaptive camera should frame product left of right-aligned copy');
const formEntryDesktop=sampleTimeline(.581,'desktop');
assert.ok(formEntryDesktop.camera.target[0] < .18, 'Form entry should clear the left headline field before copy appears');
const resolutionDesktop=sampleTimeline(.90,'desktop');
assert.ok(resolutionDesktop.camera.target[0] < -.55, 'Resolution camera should frame product right of headline');
const spatialMobile=sampleTimeline(.36,'mobile');
assert.ok(
  spatialMobile.camera.target[1] > -.30 && spatialMobile.camera.target[1] < -.04,
  'Mobile Spatial should preserve product/copy separation while keeping the product visibly framed'
);
const behindMobile=sampleTimeline(.985,'mobile');
assert.ok(behindMobile.product.scale < .78, 'Mobile Behind NOVA should keep the product secondary');


const designPose=sampleTimeline(.20,'desktop').product.pose;
assert.ok(designPose >= .16 && designPose <= .32,'Design should stay in an open design-study pose');
const designClosePoseA=sampleTimeline(.18,'desktop').product.pose;
const designClosePoseB=sampleTimeline(.20,'desktop').product.pose;
assert.ok(Math.abs(designClosePoseB-designClosePoseA) <= .035,
  `V3 Design close pass must not snap the source rig; delta=${Math.abs(designClosePoseB-designClosePoseA)}`);
const commercialOpenSamples=[.34,.36,.44,.52,.64,.79,.90];
for(const p of commercialOpenSamples){
  const pose=sampleTimeline(p,'desktop').product.pose;
  assert.ok(pose >= .64 && pose <= .80,`commercial product pose must stay open at ${p}, got ${pose}`);
}


assert.equal(sampleTimeline(.279,'desktop').ui.transition,'to-dark','Design should invert copy before Sound');
assert.equal(sampleTimeline(.57,'desktop').ui.transition,'to-light','Adaptive should darken copy before Form');
assert.equal(sampleTimeline(.959,'desktop').ui.transition,'to-dark','Resolution should invert copy before Behind NOVA');

const behindTheme=sampleTimeline(.985,'desktop');
assert.equal(behindTheme.ui.dark,true,'behind chapter should use dark navigation theme');

console.log('timeline_contract: PASS');

// V2 refinement: product-dominant authored detail passes.
const heroDetail=sampleTimeline(.02,'desktop');
assert.ok(heroDetail.camera.position[2] < 4.30, `Hero detail opening should dolly closer, got z=${heroDetail.camera.position[2]}`);
assert.ok(heroDetail.camera.fov <= 26.5, `Hero detail opening should use a tighter FOV, got ${heroDetail.camera.fov}`);
assert.ok(heroDetail.product.scale >= 1.03, `Hero detail opening should retain a physically dominant product scale, got ${heroDetail.product.scale}`);

const designDetail=sampleTimeline(.18,'desktop');
assert.ok(designDetail.camera.position[2] < 4.55, `Design detail pass should move into the earcup/cushion, got z=${designDetail.camera.position[2]}`);
assert.ok(Math.abs(designDetail.product.yaw) >= .22, `Design detail pass should use a deliberate three-quarter yaw, got ${designDetail.product.yaw}`);
assert.ok(Math.abs(designDetail.product.pitch) >= .025, `Design detail pass should expose physical depth with pitch, got ${designDetail.product.pitch}`);
assert.ok(designDetail.product.scale >= 1.04, `Design detail pass should keep the product dominant, got ${designDetail.product.scale}`);

const inspectStudy=sampleTimeline(.79,'desktop');
assert.ok(inspectStudy.camera.position[2] < 4.60, `Inspection should be the closest controlled full-product study, got z=${inspectStudy.camera.position[2]}`);
assert.ok(inspectStudy.camera.fov <= 27.5, `Inspection should use a tighter study FOV, got ${inspectStudy.camera.fov}`);

const resolutionHero=sampleTimeline(.92,'desktop');
assert.ok(resolutionHero.camera.position[2] < 4.95, `Resolution should return to a stronger hero framing, got z=${resolutionHero.camera.position[2]}`);
assert.ok(resolutionHero.product.scale >= 1.02, `Resolution should not shrink the product before Behind NOVA, got ${resolutionHero.product.scale}`);

const designDetailMobile=sampleTimeline(.18,'mobile');
assert.ok(designDetailMobile.camera.position[2] < 5.35, `Mobile Design should gain presence without desktop-level crop, got z=${designDetailMobile.camera.position[2]}`);
assert.ok(Math.abs(designDetailMobile.product.yaw) < Math.abs(designDetail.product.yaw), 'Mobile detail yaw should be shallower than desktop');
assert.ok(Math.abs(designDetailMobile.product.pitch) < Math.abs(designDetail.product.pitch), 'Mobile detail pitch should be shallower than desktop');

// Manual visual QA guard: dominant desktop product must stay right of left-aligned Hero/Design copy.
for (const [p,minOffset,label] of [
  [.02,.20,'Hero opening'],
  [.10,.20,'Hero resolved'],
  [.18,.28,'Design close pass'],
  [.20,.30,'Design peak detail']
]) {
  const state=sampleTimeline(p,'desktop');
  const lateralOffset=state.product.position[0]-state.camera.target[0];
  assert.ok(lateralOffset >= minOffset, `${label} must preserve headline separation while staying large; lateral offset=${lateralOffset}`);
}

const designMobileClearance=sampleTimeline(.20,'mobile');
const designMobileLateralOffset=designMobileClearance.product.position[0]-designMobileClearance.camera.target[0];
assert.ok(designMobileLateralOffset <= .07, `Mobile Design close pass must recenter enough to keep real hotspot targets on-screen; lateral offset=${designMobileLateralOffset}`);


const behindDesktopR10=sampleTimeline(.985,'desktop');
assert.ok(behindDesktopR10.product.scale < .62, `Behind handoff should make the product clearly secondary on desktop, got ${behindDesktopR10.product.scale}`);
const behindMobileR10=sampleTimeline(.985,'mobile');
assert.ok(behindMobileR10.product.scale < .56, `Behind handoff should make the product clearly secondary on mobile, got ${behindMobileR10.product.scale}`);


const r12MobileResolution=sampleTimeline(.92,'mobile');
assert.ok(r12MobileResolution.product.position[1]>.02 && r12MobileResolution.product.position[1]<.16,
  `Mobile Resolution should keep the product near the visual center instead of parking it above the viewport, got y=${r12MobileResolution.product.position[1]}`);


const r13SpatialStart=sampleTimeline(.32,'desktop');
const r13SpatialEnd=sampleTimeline(.45,'desktop');
assert.ok(Math.abs(r13SpatialEnd.product.yaw-r13SpatialStart.product.yaw) <= .05,
  `R13 Sound scene should keep product yaw calm while the field changes, delta=${Math.abs(r13SpatialEnd.product.yaw-r13SpatialStart.product.yaw)}`);
assert.ok(Math.abs(r13SpatialEnd.product.position[0]-r13SpatialStart.product.position[0]) <= .025,
  'R13 Sound scene should keep product laterally stable');
assert.ok(r13SpatialEnd.environment.spatialAmount-r13SpatialStart.environment.spatialAmount >= .25,
  'R13 Sound scene should communicate mode change through environment more than product motion');

const r13AdaptiveStart=sampleTimeline(.49,'desktop');
const r13AdaptiveEnd=sampleTimeline(.54,'desktop');
assert.ok(Math.abs(r13AdaptiveEnd.product.yaw-r13AdaptiveStart.product.yaw) <= .04,
  'R13 Noise-control scene should keep the product calm during environmental transition');
assert.ok(r13AdaptiveEnd.environment.adaptiveAmount-r13AdaptiveStart.environment.adaptiveAmount >= .20,
  'R13 Noise-control scene should communicate change through the environment');


// R14 / V3 narrative articulation: concentrate source-clip motion into deliberate
// physical beats instead of making the rig "breathe" open/closed under every chapter.
const r14SoundStart=sampleTimeline(.34,'desktop').product.pose;
const r14SoundEnd=sampleTimeline(.44,'desktop').product.pose;
assert.ok(r14SoundEnd-r14SoundStart >= .08,
  `R14 Sound should retain the expressive one-way opening action; delta=${r14SoundEnd-r14SoundStart}`);

const r14AdaptiveStart=sampleTimeline(.45,'desktop').product.pose;
const r14AdaptiveEnd=sampleTimeline(.58,'desktop').product.pose;
assert.ok(r14AdaptiveStart-r14AdaptiveEnd >= .015 && r14AdaptiveStart-r14AdaptiveEnd <= .035,
  `R14 Adaptive should settle the opened rig subtly in one direction; delta=${r14AdaptiveStart-r14AdaptiveEnd}`);

for(const [label,start,end,maxSpan] of [
  ['Form',.58,.72,.025],
  ['Inspect',.72,.86,.018],
  ['Resolution',.86,.96,.018]
]){
  const poses=[];
  for(let p=start;p<=end+1e-9;p+=(end-start)/20) poses.push(sampleTimeline(p,'desktop').product.pose);
  const span=Math.max(...poses)-Math.min(...poses);
  assert.ok(span <= maxSpan,
    `R14 ${label} should keep physical articulation stable while its own interaction/camera system owns motion; pose span=${span}`);
}

const r14BehindStart=sampleTimeline(.96,'desktop').product.pose;
const r14BehindEnd=sampleTimeline(1,'desktop').product.pose;
assert.ok(r14BehindStart-r14BehindEnd >= .07,
  `R14 Behind handoff should retain a deliberate final closing/recession; delta=${r14BehindStart-r14BehindEnd}`);


// V3 motion-continuity contract: no accordion reversals or abrupt rig scrubbing.
const v3DesignPoints=[.16,.18,.20,.22,.24,.26,.28];
const v3DesignPoses=v3DesignPoints.map(p=>sampleTimeline(p,'desktop').product.pose);
for(let i=1;i<v3DesignPoses.length;i++){
  assert.ok(v3DesignPoses[i] >= v3DesignPoses[i-1]-.004,
    `V3 Design pose must progress smoothly without reversing; ${v3DesignPoses[i-1]} -> ${v3DesignPoses[i]}`);
}
let v3MaxPoseStep=0;
let v3Prev=sampleTimeline(.16,'desktop').product.pose;
for(let p=.162;p<=.36+1e-9;p+=.002){
  const pose=sampleTimeline(p,'desktop').product.pose;
  v3MaxPoseStep=Math.max(v3MaxPoseStep,Math.abs(pose-v3Prev));
  v3Prev=pose;
}
assert.ok(v3MaxPoseStep <= .020,
  `V3 source-pose scrub must remain continuous through Design→Sound; max .002-scroll step=${v3MaxPoseStep}`);


const v3SettleA=sampleTimeline(.19,'desktop');
const v3SettleB=sampleTimeline(.22,'desktop');
assert.ok(Math.abs(v3SettleB.product.yaw-v3SettleA.product.yaw) <= .012,
  `V3 Design settle yaw drift must stay bounded for stable engineering annotations; delta=${Math.abs(v3SettleB.product.yaw-v3SettleA.product.yaw)}`);
