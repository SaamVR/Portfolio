const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const lerp = (a,b,t) => a + (b-a) * t;

export function createInteractionState(){
  return {
    fold:{weight:0,targetPose:0,active:false},
    inspection:{weight:0,yaw:0,pitch:0,modelYaw:0,view:'front',active:false},
    hotspot:{weight:0,id:null,cameraOffset:[0,0,0],targetOffset:[0,0,0]},
    listening:{mode:'spatial',weight:0},
    noise:{mode:'adaptive',weight:0},
    pointer:{x:0,y:0,weight:0}
  };
}

function cloneBase(base){
  return {
    ...base,
    product:{...base.product, position:[...base.product.position]},
    camera:{...base.camera, position:[...base.camera.position], target:[...base.camera.target]},
    lighting:{...base.lighting, keyPosition:[...base.lighting.keyPosition]},
    environment:{...base.environment},
    ui:{...base.ui}
  };
}

export function composeVisualState(baseState, interactionState=createInteractionState()){
  const out = cloneBase(baseState);
  const fold = interactionState.fold || {};
  const fw = clamp01(fold.weight);
  if(fold.active || fw > 0) out.product.pose = lerp(out.product.pose, Number.isFinite(fold.targetPose)?fold.targetPose:out.product.pose, fw);

  const inspection = interactionState.inspection || {};
  const iw = clamp01(inspection.weight);
  if(iw > 0){
    out.camera.position[0] += (inspection.yaw || 0) * 1.05 * iw;
    out.camera.position[1] += (inspection.pitch || 0) * .72 * iw;
    out.product.yaw += (inspection.modelYaw || 0) * iw;
  }

  const hotspot = interactionState.hotspot || {};
  const hw = clamp01(hotspot.weight);
  const hotspotCameraWeight = hw * (1-iw);
  for(let i=0;i<3;i++){
    out.camera.position[i] += (hotspot.cameraOffset?.[i] || 0) * hotspotCameraWeight;
    out.camera.target[i] += (hotspot.targetOffset?.[i] || 0) * hotspotCameraWeight;
  }
  out.lighting.key *= 1 + .12 * hw;

  const listening = interactionState.listening || {};
  const lw = clamp01(listening.weight);
  if(lw > 0){
    const targetSpread = listening.mode === 'focus' ? .42 : listening.mode === 'ambient' ? 1.18 : 1.0;
    const targetMotion = listening.mode === 'focus' ? .18 : listening.mode === 'ambient' ? .74 : .58;
    out.environment.spatialSpread = lerp(out.environment.spatialSpread,targetSpread,lw);
    out.environment.motion = lerp(out.environment.motion,targetMotion,lw);
    out.lighting.rim = lerp(out.lighting.rim, listening.mode === 'focus' ? 8.2 : 11.8, lw*.65);
  }

  const noise = interactionState.noise || {};
  const nw = clamp01(noise.weight);
  if(nw > 0){
    const openness = noise.mode === 'transparency' ? 1 : .28;
    const adaptive = noise.mode === 'transparency' ? .1 : 1;
    out.environment.openness = lerp(out.environment.openness,openness,nw);
    out.environment.adaptiveAmount = lerp(out.environment.adaptiveAmount,adaptive,nw);
    out.lighting.fill = lerp(out.lighting.fill, noise.mode === 'transparency' ? 1.35 : .58, nw*.7);
  }

  const pointer = interactionState.pointer || {};
  const pw = clamp01(pointer.weight) * (1-iw);
  out.camera.position[0] += (pointer.x || 0) * .08 * pw;
  out.camera.position[1] -= (pointer.y || 0) * .05 * pw;
  out.lighting.keyPosition[0] += (pointer.x || 0) * 1.4 * pw;
  out.lighting.keyPosition[1] -= (pointer.y || 0) * .9 * pw;

  return out;
}
