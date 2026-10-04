import {composeVisualState as composeArchive,createInteractionState} from './composer.js';
export {createInteractionState};
export function composeVisualState(base,interactions){
  const state=composeArchive(base,interactions);
  state.product.controlled=Boolean(interactions.fold?.active);
  state.product.inspectionYaw+=(base.product.inspectionYaw||0);
  // The launch's named turntable uses a single pre-authored safe full-product frame.
  const weight=Math.max(0,Math.min(1,interactions.inspection?.weight||0));
  state.camera.target[1]-=.34*weight*weight;
  state.camera.position[2]-=.18*weight*weight;
  return state;
}
