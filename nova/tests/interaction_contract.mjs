import assert from 'node:assert/strict';
import { createFoldController } from '../site/interactions/fold-controller.js';
import { createInspectionController } from '../site/interactions/inspection-controller.js';
import { createModeController } from '../site/interactions/mode-controller.js';
import { createHotspotController } from '../site/interactions/hotspot-controller.js';
import { normalizeEnvironmentState, createEnvironment } from '../site/runtime/environment.js';

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


const normalized=normalizeEnvironmentState({tone:2,spatialAmount:-1,spatialSpread:9,adaptiveAmount:.5,openness:.8,motion:.4});
assert.equal(normalized.tone,1);
assert.equal(normalized.spatialAmount,0);
assert.equal(normalized.spatialSpread,2);
assert.equal(typeof createEnvironment,'function');

class FakeVector3 {
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  fromArray(v){return this.set(v[0],v[1],v[2]);}
  clone(){return new FakeVector3().set(this.x,this.y,this.z);}
  project(){return this;}
}
const fakeElement={dataset:{},style:{},setAttribute(){}};
const hotspots=createHotspotController({
  THREE:{Vector3:FakeVector3},
  camera:{},
  anchors:{cushion:{point:[.2,.1,0],cameraOffset:[.1,0,0],targetOffset:[0,.1,0]}},
  elements:{cushion:fakeElement}
});
hotspots.focus('cushion');
hotspots.update({modelRoot:{localToWorld:v=>v},viewport:{width:1000,height:800}});
assert.equal(fakeElement.dataset.visible,'true');
assert.ok(String(fakeElement.style.transform).includes('translate3d'));
assert.equal(hotspots.getInfluence().id,'cushion');


let boneReads=0;
const animatedBone={
  getWorldPosition(v){
    boneReads++;
    return v.set(.2,.1,0);
  }
};
const boneElement={dataset:{},style:{},setAttribute(){}};
const boneHotspots=createHotspotController({
  THREE:{Vector3:FakeVector3},
  camera:{},
  anchors:{earcup:{object:animatedBone,cameraOffset:[0,0,0],targetOffset:[0,0,0]}},
  elements:{earcup:boneElement}
});
boneHotspots.update({viewport:{width:1000,height:800}});
assert.equal(boneReads,1,'animated hotspot must read its bone world position each update');
assert.ok(String(boneElement.style.transform).includes('600px'),'bone X position should drive DOM projection');
assert.ok(String(boneElement.style.transform).includes('360px'),'bone Y position should drive DOM projection');

console.log('interaction_contract: PASS');
