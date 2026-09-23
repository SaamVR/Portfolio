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
console.log('timeline_contract: PASS');
