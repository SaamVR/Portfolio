import assert from 'node:assert/strict';
import { createInspectionController } from '../site/interactions/inspection-controller.js';

const DT=1/60;

{
  const inspect=createInspectionController({maxYaw:.52,maxPitch:.12});
  inspect.setActive(true);
  inspect.dragBy(500,220,{width:1000,height:800});
  const dragged=inspect.getInfluence();
  assert.ok(Math.abs(dragged.yaw)>.4 && Math.abs(dragged.pitch)>.1);

  inspect.setView('side');
  const immediatelyAfterPreset=inspect.getInfluence();
  assert.ok(Math.abs(immediatelyAfterPreset.yaw-dragged.yaw)<1e-6,
    'preset selection must not hard-zero the manual drag camera offset');
  assert.ok(Math.abs(immediatelyAfterPreset.pitch-dragged.pitch)<1e-6,
    'preset selection must not hard-zero the manual drag camera pitch');

  for(let n=0;n<6;n++) inspect.update(DT);
  const released=inspect.getInfluence();
  assert.ok(Math.abs(released.yaw)<Math.abs(dragged.yaw) && Math.abs(released.yaw)>.02,
    'manual yaw should ease toward neutral over several frames after a preset');
  assert.ok(Math.abs(released.pitch)<Math.abs(dragged.pitch) && Math.abs(released.pitch)>.005,
    'manual pitch should ease toward neutral over several frames after a preset');
}

{
  const inspect=createInspectionController();
  inspect.setActive(true);
  inspect.setView('rear');
  for(let n=0;n<30;n++) inspect.update(DT);
  const beforeExit=inspect.getInfluence();
  assert.ok(beforeExit.modelYaw>2.7 && beforeExit.weight>.9);

  inspect.setActive(false);
  inspect.update(DT);
  const firstExitFrame=inspect.getInfluence();

  assert.ok(firstExitFrame.weight<beforeExit.weight,
    'leaving Inspect should begin fading inspection ownership');
  assert.ok(Math.abs(firstExitFrame.modelYaw-beforeExit.modelYaw)<.01,
    'leaving Inspect should not simultaneously spring model yaw while ownership is already fading');
}

console.log('motion_handoff_contract: PASS');
