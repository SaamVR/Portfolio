const DEFAULT_DT = 1/60;

export function createRenderAdapter({
  THREE,
  camera,
  presentation,
  inspection=null,
  mixer,
  clipDuration,
  renderer,
  lights,
  environment,
  orientationX=-Math.PI/2
}){
  if(!THREE || !camera || !presentation || !renderer) throw new Error('render adapter missing required dependencies');
  const splitInspection=Boolean(inspection && inspection!==presentation);
  const damp=(current,target,lambda,dt)=>THREE.MathUtils.damp(current,target,lambda,dt||DEFAULT_DT);
  let renderedPose=null;
  let renderedTarget=null;
  let renderedFraming=null;
  function frameCamera(state,dt=0){
    if(!state.camera.framing) return;
    if(!renderedFraming || !dt) renderedFraming=[...state.camera.framing];
    else renderedFraming=renderedFraming.map((v,i)=>damp(v,state.camera.framing[i],5,dt));
    camera.projectionMatrix.elements[8]=1-2*renderedFraming[0];
    camera.projectionMatrix.elements[9]=2*renderedFraming[1]-1;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  const applyVec=(obj,key,values,lambda,dt)=>{
    obj[key].x=damp(obj[key].x,values[0],lambda,dt);
    obj[key].y=damp(obj[key].y,values[1],lambda,dt);
    obj[key].z=damp(obj[key].z,values[2],lambda,dt);
  };
  const setVec=(obj,key,values)=>{
    obj[key].x=values[0];
    obj[key].y=values[1];
    obj[key].z=values[2];
  };
  const snap=state=>{
    if(!state) return;
    setVec(camera,'position',state.camera.position);
    camera.fov=state.camera.fov;
    camera.updateProjectionMatrix();
    frameCamera(state);
    renderedTarget=[...state.camera.target];
    camera.lookAt(...renderedTarget);

    setVec(presentation,'position',state.product.position);
    presentation.rotation.x=orientationX+state.product.pitch;
    presentation.rotation.y=state.product.yaw;
    presentation.rotation.z=0;
    if(splitInspection){
      inspection.rotation.x=state.product.inspectionPitch || 0;
      inspection.rotation.y=0;
      inspection.rotation.z=state.product.inspectionYaw || 0;
    }
    const s=state.product.scale;
    presentation.scale.x=s;
    presentation.scale.y=s;
    presentation.scale.z=s;

    if(mixer && Number.isFinite(clipDuration)){
      renderedPose=Math.max(0,Math.min(1,state.product.pose));
      mixer.setTime(renderedPose*clipDuration);
    }

    renderer.toneMappingExposure=state.lighting.exposure;
    if(lights){
      if(lights.hemi) lights.hemi.intensity=state.lighting.hemi;
      if(lights.key){
        lights.key.intensity=state.lighting.key;
        lights.key.color.setHex(state.lighting.keyColor);
        setVec(lights.key,'position',state.lighting.keyPosition);
      }
      if(lights.fill) lights.fill.intensity=state.lighting.fill;
      if(lights.rim){
        lights.rim.intensity=state.lighting.rim;
        lights.rim.color.setHex(state.lighting.rimColor);
      }
      if(lights.warm) lights.warm.intensity=state.lighting.warm;
    }
    environment?.apply?.(state.environment,0);
  };
  return {
    snap,
    getPose:()=>renderedPose,
    isSettled(state){
      const poseReady=renderedPose===null || Math.abs(renderedPose-state.product.pose)<.002;
      const framingReady=!state.camera.framing || renderedFraming?.every((v,i)=>Math.abs(v-state.camera.framing[i])<.003);
      return Boolean(poseReady&&framingReady);
    },
    apply(state,dt=DEFAULT_DT){
      if(!state) return;
      const step=Math.max(.001,Math.min(.1,dt||DEFAULT_DT));
      const cameraLambda = state.range === 'behind' ? 3.35 : state.range === 'resolution' ? 3.15 : 3.0;
      applyVec(camera,'position',state.camera.position,cameraLambda,step);
      camera.fov=damp(camera.fov,state.camera.fov,2.70,step);
      camera.updateProjectionMatrix();
      frameCamera(state,step);
      if(renderedTarget===null) renderedTarget=[...state.camera.target];
      else{
        // Resolution must reclaim the headline field promptly after the
        // inspection turntable. A slightly faster look-target convergence is
        // still eased, but prevents the inspection framing tail from crossing
        // the next chapter's copy during a normal scroll/jump handoff.
        const targetLambda=state.range==='behind' ? 4.8 : state.range==='resolution' ? 5.4 : 3.75;
        renderedTarget[0]=damp(renderedTarget[0],state.camera.target[0],targetLambda,step);
        renderedTarget[1]=damp(renderedTarget[1],state.camera.target[1],targetLambda,step);
        renderedTarget[2]=damp(renderedTarget[2],state.camera.target[2],targetLambda,step);
      }
      camera.lookAt(...renderedTarget);

      const productPositionLambda = state.range === 'inspect' ? 3.45 : 3.2;
      presentation.position.x=damp(presentation.position.x,state.product.position[0],productPositionLambda,step);
      presentation.position.y=damp(presentation.position.y,state.product.position[1],productPositionLambda,step);
      presentation.position.z=damp(presentation.position.z,state.product.position[2],productPositionLambda,step);
      presentation.rotation.x=damp(presentation.rotation.x,orientationX+state.product.pitch,3.85,step);
      presentation.rotation.y=damp(presentation.rotation.y,state.product.yaw,3.55,step);
      presentation.rotation.z=damp(presentation.rotation.z,0,3.55,step);
      if(splitInspection){
        // The inspection controller already integrates its spring and drag
        // release. A second low-pass filter here makes direct input feel late.
        inspection.rotation.x=state.product.inspectionPitch || 0;
        inspection.rotation.y=0;
        inspection.rotation.z=state.product.inspectionYaw || 0;
      }
      const s=state.product.scale;
      presentation.scale.x=damp(presentation.scale.x,s,2.85,step);
      presentation.scale.y=damp(presentation.scale.y,s,2.85,step);
      presentation.scale.z=damp(presentation.scale.z,s,2.85,step);

      if(mixer && Number.isFinite(clipDuration)){
        const targetPose=Math.max(0,Math.min(1,state.product.pose));
        if(renderedPose===null) renderedPose=targetPose;
        else{
          const candidate=damp(renderedPose,targetPose,7.2,step);
          // Keep source animation responsive while retaining a hard velocity cap.
          // This prevents scroll jumps from becoming visible rig scrubs.
          const maxPoseDelta=Math.max(.0012,step*.40);
          renderedPose += Math.max(-maxPoseDelta,Math.min(maxPoseDelta,candidate-renderedPose));
        }
        mixer.setTime(renderedPose*clipDuration);
      }

      renderer.toneMappingExposure=damp(renderer.toneMappingExposure,state.lighting.exposure,3.7,step);
      if(lights){
        if(lights.hemi) lights.hemi.intensity=damp(lights.hemi.intensity,state.lighting.hemi,3.7,step);
        if(lights.key){
          lights.key.intensity=damp(lights.key.intensity,state.lighting.key,3.7,step);
          lights.key.color.setHex(state.lighting.keyColor);
          applyVec(lights.key,'position',state.lighting.keyPosition,4.5,step);
        }
        if(lights.fill) lights.fill.intensity=damp(lights.fill.intensity,state.lighting.fill,3.7,step);
        if(lights.rim){
          lights.rim.intensity=damp(lights.rim.intensity,state.lighting.rim,3.7,step);
          lights.rim.color.setHex(state.lighting.rimColor);
        }
        if(lights.warm) lights.warm.intensity=damp(lights.warm.intensity,state.lighting.warm,3.7,step);
      }
      environment?.apply?.(state.environment,step);
    }
  };
}
