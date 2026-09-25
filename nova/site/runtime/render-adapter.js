const DEFAULT_DT = 1/60;
const clamp01=v=>Math.max(0,Math.min(1,v));

export function createRenderAdapter({
  THREE,
  camera,
  presentation,
  mixer,
  clipDuration,
  renderer,
  lights,
  environment,
  orientationX=-Math.PI/2
}){
  if(!THREE || !camera || !presentation || !renderer) throw new Error('render adapter missing required dependencies');
  const damp=(current,target,lambda,dt)=>THREE.MathUtils.damp(current,target,lambda,dt||DEFAULT_DT);
  const applyVec=(obj,key,values,lambda,dt)=>{
    obj[key].x=damp(obj[key].x,values[0],lambda,dt);
    obj[key].y=damp(obj[key].y,values[1],lambda,dt);
    obj[key].z=damp(obj[key].z,values[2],lambda,dt);
  };
  const cameraTarget={x:0,y:0,z:0};
  let posePhase=Number.isFinite(mixer?.time) && Number.isFinite(clipDuration) && clipDuration>0
    ? clamp01(mixer.time/clipDuration)
    : 0;

  return {
    apply(state,dt=DEFAULT_DT){
      if(!state) return;
      const step=Math.max(.001,Math.min(.05,dt||DEFAULT_DT));
      applyVec(camera,'position',state.camera.position,4.2,step);
      cameraTarget.x=damp(cameraTarget.x,state.camera.target[0],5.4,step);
      cameraTarget.y=damp(cameraTarget.y,state.camera.target[1],5.4,step);
      cameraTarget.z=damp(cameraTarget.z,state.camera.target[2],5.4,step);
      camera.fov=damp(camera.fov,state.camera.fov,4.2,step);
      camera.updateProjectionMatrix();
      camera.lookAt(cameraTarget.x,cameraTarget.y,cameraTarget.z);

      presentation.position.x=damp(presentation.position.x,state.product.position[0],4.5,step);
      presentation.position.y=damp(presentation.position.y,state.product.position[1],4.5,step);
      presentation.position.z=damp(presentation.position.z,state.product.position[2],4.5,step);
      presentation.rotation.x=damp(presentation.rotation.x,orientationX+state.product.pitch,5.2,step);
      presentation.rotation.y=damp(presentation.rotation.y,state.product.yaw,4.6,step);
      const s=state.product.scale;
      presentation.scale.x=damp(presentation.scale.x,s,4.5,step);
      presentation.scale.y=damp(presentation.scale.y,s,4.5,step);
      presentation.scale.z=damp(presentation.scale.z,s,4.5,step);

      if(mixer && Number.isFinite(clipDuration)){
        posePhase=damp(posePhase,clamp01(state.product.pose),7.2,step);
        mixer.setTime(posePhase*clipDuration);
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
    },
    getDiagnostics(){
      return {
        cameraTarget:[cameraTarget.x,cameraTarget.y,cameraTarget.z],
        posePhase
      };
    }
  };
}
