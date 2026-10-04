import assert from 'node:assert/strict';
import * as THREE from '../site/vendor/three.module.js';
import {createArticulation} from '../site/runtime/articulation.js';
import {applyLivingMotion} from '../site/runtime/living-motion.js';
import {sampleTimeline} from '../site/runtime/launch-timeline.js';
const root=new THREE.Group(),bone=new THREE.Bone();root.add(bone);
const sampled=[];
const mixer={setTime(time){sampled.push(time);bone.position.x=time;bone.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),time);}};
const articulation=createArticulation({root,mixer,clipDuration:1});
articulation.apply(.24,1/60,{snap:true});
articulation.apply(.72,1/60);
assert.deepEqual(sampled,[.24,.72],'Handoffs must sample only the requested gestures, not scrub the unrelated clip between them');
assert.ok(bone.position.x>.24&&bone.position.x<.72,'The joint must blend from its visible pose');
articulation.apply(.30,1/60,{snap:true});
assert.equal(bone.position.x,.30,'Reduced motion must settle at the requested source pose');
function settle(fps){
  const a=createArticulation({root,mixer,clipDuration:1});a.apply(.24,1/fps,{snap:true});
  for(let i=0;i<fps;i++)a.apply(.30,1/fps);
  return bone.position.x;
}
assert.ok(Math.abs(settle(30)-settle(60))<1e-10,'Joint blending must be time-based');
const p=.43,still=sampleTimeline(p),alive=applyLivingMotion(sampleTimeline(p),3);
assert.notDeepEqual(alive.product.position,still.product.position,'The product should stay alive during a reading hold');
assert.deepEqual(alive.camera,still.camera,'Ambient movement must not move the text composition');
assert.deepEqual(applyLivingMotion(sampleTimeline(p),3,{reducedMotion:true}),still);
const inspect=sampleTimeline(.815);
assert.deepEqual(applyLivingMotion(sampleTimeline(.815),3),inspect,'The user must own the inspection view');
assert.deepEqual(applyLivingMotion(sampleTimeline(p),3,{hotspotWeight:1}),still,'A selected detail must stay still');
console.log('living-articulation: PASS (gesture isolation, smooth joints, frame rate, ambient movement and user ownership)');
