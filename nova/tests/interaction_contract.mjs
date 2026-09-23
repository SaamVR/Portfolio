import assert from 'node:assert/strict';
import { createFoldController } from '../site/interactions/fold-controller.js';
import { createInspectionController } from '../site/interactions/inspection-controller.js';
import { createModeController } from '../site/interactions/mode-controller.js';

const fold = createFoldController({ openPose:.20, foldedPose:.40, duration:.7 });
fold.begin('fold', .24);
fold.update(.35, { scrollActive:false, timelinePose:.25 });
let influence = fold.getInfluence();
assert.equal(influence.active, true);
assert.ok(influence.weight > 0);
assert.ok(influence.targetPose > .24);
fold.update(.5, { scrollActive:true, timelinePose:.28 });
influence = fold.getInfluence();
assert.ok(influence.weight < 1, 'scroll resumption must release fold ownership');

const inspect = createInspectionController({ maxYaw:.52, maxPitch:.12 });
inspect.setActive(true);
inspect.dragBy(500, 300, { width:1000, height:800 });
let i = inspect.getInfluence();
assert.ok(Math.abs(i.yaw) <= .52);
assert.ok(Math.abs(i.pitch) <= .12);
inspect.reset();
i = inspect.getInfluence();
assert.equal(i.yaw, 0);
assert.equal(i.pitch, 0);

const modes = createModeController();
modes.setListening('focus');
modes.setNoise('transparency');
modes.update(.2);
const m = modes.getInfluence();
assert.equal(m.listening.mode, 'focus');
assert.equal(m.noise.mode, 'transparency');
assert.ok(m.listening.weight > 0);
assert.ok(m.noise.weight > 0);
modes.setListening('invalid');
assert.equal(modes.getInfluence().listening.mode, 'focus');

console.log('interaction_contract: PASS');
