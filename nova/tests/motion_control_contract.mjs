import assert from 'node:assert/strict';
import { createInspectionController } from '../site/interactions/inspection-controller.js';
import { createFoldController } from '../site/interactions/fold-controller.js';

const DT=1/60;

{
  const inspect=createInspectionController({maxYaw:.52,maxPitch:.12});
  inspect.setActive(true);
  inspect.dragBy(500,220,{width:1000,height:800});
  const dragged=inspect.getInfluence();
  inspect.reset();
  const immediatelyAfterReset=inspect.getInfluence();
  assert.ok(Math.abs(immediatelyAfterReset.yaw-dragged.yaw)<1e-6,
    'Reset view must not hard-zero manual yaw in the click handler');
  assert.ok(Math.abs(immediatelyAfterReset.pitch-dragged.pitch)<1e-6,
    'Reset view must not hard-zero manual pitch in the click handler');
  for(let n=0;n<6;n++) inspect.update(DT);
  const released=inspect.getInfluence();
  assert.ok(Math.abs(released.yaw)<Math.abs(dragged.yaw) && Math.abs(released.yaw)>.02,
    'Reset view should ease manual yaw to neutral over several frames');
}

{
  const fold=createFoldController({openPose:.20,foldedPose:.40,duration:.92});
  fold.begin('fold',.72);
  let previous=.72;
  let beforeDelta=0;
  for(let n=0;n<20;n++){
    fold.update(DT,{scrollActive:false,timelinePose:.72});
    const pose=fold.getInfluence().targetPose;
    beforeDelta=pose-previous;
    previous=pose;
  }
  assert.ok(Math.abs(beforeDelta)>.004,'precondition: fold should be moving before retarget');

  fold.begin('open',previous);
  fold.update(DT,{scrollActive:false,timelinePose:.72});
  const firstAfter=fold.getInfluence().targetPose;
  const afterDelta=firstAfter-previous;

  assert.ok(Math.sign(afterDelta)===Math.sign(beforeDelta),
    'same-direction fold retarget should preserve direction on the first frame');
  assert.ok(Math.abs(afterDelta)>=Math.abs(beforeDelta)*.25,
    'fold retarget should preserve meaningful velocity instead of pausing at a restarted smoothstep');
}

console.log('motion_control_contract: PASS');
