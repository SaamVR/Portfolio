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
assert.notEqual(composed.camera.position[0], base.camera.position[0]);
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
assert.ok(spatialDesktop.camera.target[1] < -.40, 'Spatial camera should frame product above centered copy');
const adaptiveDesktop=sampleTimeline(.52,'desktop');
assert.ok(adaptiveDesktop.camera.target[0] > .38, 'Adaptive camera should frame product left of right-aligned copy');
const formEntryDesktop=sampleTimeline(.581,'desktop');
assert.ok(formEntryDesktop.camera.target[0] < .18, 'Form entry should clear the left headline field before copy appears');
const resolutionDesktop=sampleTimeline(.90,'desktop');
assert.ok(resolutionDesktop.camera.target[0] < -.55, 'Resolution camera should frame product right of headline');
const spatialMobile=sampleTimeline(.36,'mobile');
assert.ok(spatialMobile.camera.target[1] < -.62, 'Mobile Spatial should keep product above the copy');
const behindMobile=sampleTimeline(.985,'mobile');
assert.ok(behindMobile.product.scale < .78, 'Mobile Behind NOVA should keep the product secondary');


const designPose=sampleTimeline(.20,'desktop').product.pose;
assert.ok(designPose >= .16 && designPose <= .32,'Design should stay in an open design-study pose');
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
