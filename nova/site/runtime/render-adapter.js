const DEFAULT_DT = 1/60;

export function createRenderAdapter({
  THREE,
  camera,
  presentation,
  orientation=presentation,
  mixer,
  clipDuration,
  renderer,
  lights,
  environment,
  orientationX=-Math.PI/2
}){
  if(!THREE || !camera || !presentation || !orientation || !renderer) throw new Error('render adapter missing required dependencies');
  const splitOrientation=orientation!==presentation;
  const damp=(current,target,lambda,dt)=>THREE.MathUtils.damp(current,target,lambda,dt||DEFAULT_DT);
  let renderedPose=null;
  let renderedTarget=null;
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
    renderedTarget=[...state.camera.target];
    camera.lookAt(...renderedTarget);

    setVec(presentation,'position',state.product.position);
    if(splitOrientation){
      presentation.rotation.x=0;
      presentation.rotation.y=state.product.inspectionYaw || 0;
      orientation.rotation.x=orientationX+state.product.pitch;
      orientation.rotation.y=state.product.yaw;
    }else{
      presentation.rotation.x=orientationX+state.product.pitch;
      presentation.rotation.y=state.product.yaw;
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
    apply(state,dt=DEFAULT_DT){
      if(!state) return;
      const step=Math.max(.001,Math.min(.05,dt||DEFAULT_DT));
      applyVec(camera,'position',state.camera.position,2.65,step);
      camera.fov=damp(camera.fov,state.camera.fov,2.70,step);
      camera.updateProjectionMatrix();
      if(renderedTarget===null) renderedTarget=[...state.camera.target];
      else{
        renderedTarget[0]=damp(renderedTarget[0],state.camera.target[0],3.00,step);
        renderedTarget[1]=damp(renderedTarget[1],state.camera.target[1],3.00,step);
        renderedTarget[2]=damp(renderedTarget[2],state.camera.target[2],3.00,step);
      }
      camera.lookAt(...renderedTarget);

      presentation.position.x=damp(presentation.position.x,state.product.position[0],2.85,step);
      presentation.position.y=damp(presentation.position.y,state.product.position[1],2.85,step);
      presentation.position.z=damp(presentation.position.z,state.product.position[2],2.85,step);
      if(splitOrientation){
        presentation.rotation.x=damp(presentation.rotation.x,0,3.40,step);
        presentation.rotation.y=damp(presentation.rotation.y,state.product.inspectionYaw || 0,3.00,step);
        orientation.rotation.x=damp(orientation.rotation.x,orientationX+state.product.pitch,3.40,step);
        orientation.rotation.y=damp(orientation.rotation.y,state.product.yaw,3.00,step);
      }else{
        presentation.rotation.x=damp(presentation.rotation.x,orientationX+state.product.pitch,3.40,step);
        presentation.rotation.y=damp(presentation.rotation.y,state.product.yaw,3.00,step);
      }
      const s=state.product.scale;
      presentation.scale.x=damp(presentation.scale.x,s,2.85,step);
      presentation.scale.y=damp(presentation.scale.y,s,2.85,step);
      presentation.scale.z=damp(presentation.scale.z,s,2.85,step);

      if(mixer && Number.isFinite(clipDuration)){
        const targetPose=Math.max(0,Math.min(1,state.product.pose));
        if(renderedPose===null) renderedPose=targetPose;
        else{
          const candidate=damp(renderedPose,targetPose,5.8,step);
          const maxPoseDelta=Math.max(.0012,step*.36);
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
