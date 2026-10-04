// Camera, aim, model scale and orientation share one time constant.
// Named inspection views have already been spring-integrated by their controller.
import {createArticulation} from './articulation.js';
export function createRenderAdapter({THREE,camera,presentation,inspection,mixer,model,clipDuration,renderer,lights,environment,orientationX=-Math.PI/2}){
  let pose=null,look=null;
  const articulation=createArticulation({root:model,mixer,clipDuration});
  const damp=(a,b,dt)=>THREE.MathUtils.damp(a,b,7,dt);
  const applyVector=(object,values,dt,snap)=>{
    for(const [i,key] of ['x','y','z'].entries()) object[key]=snap?values[i]:damp(object[key],values[i],dt);
  };
  function apply(state,dt=1/60,snap=false){
    dt=Math.max(.001,Math.min(.05,dt));
    applyVector(camera.position,state.camera.position,dt,snap);
    camera.fov=snap?state.camera.fov:damp(camera.fov,state.camera.fov,dt);
    camera.updateProjectionMatrix();
    if(!look||snap) look=[...state.camera.target];
    else look=look.map((v,i)=>damp(v,state.camera.target[i],dt));
    camera.lookAt(...look);
    applyVector(presentation.position,state.product.position,dt,snap);
    applyVector(presentation.rotation,[orientationX+state.product.pitch,state.product.yaw,0],dt,snap);
    applyVector(presentation.scale,Array(3).fill(state.product.scale),dt,snap);
    if(inspection){
      // Authored turn is eased once; manual spring rotation stays directly responsive.
      inspection.rotation.x=state.product.inspectionPitch||0;
      inspection.rotation.y=0;
      inspection.rotation.z=state.product.inspectionYaw||0;
    }
    if(articulation){
      articulation.apply(state.product.pose,dt,{snap});
    }else if(mixer){
      pose=pose===null||snap||state.product.controlled?state.product.pose:damp(pose,state.product.pose,dt);
      mixer.setTime(pose*clipDuration);
    }
    renderer.toneMappingExposure=snap?state.lighting.exposure:damp(renderer.toneMappingExposure,state.lighting.exposure,dt);
    for(const name of ['hemi','key','fill','rim','warm']){
      const light=lights?.[name];if(!light) continue;
      light.intensity=snap?state.lighting[name]:damp(light.intensity,state.lighting[name],dt);
    }
    lights?.key?.color.setHex(state.lighting.keyColor);
    lights?.rim?.color.setHex(state.lighting.rimColor);
    if(lights?.key) applyVector(lights.key.position,state.lighting.keyPosition,dt,snap);
    environment?.apply?.(state.environment,snap?0:dt);
  }
  return {apply,snap:state=>apply(state,1/60,true)};
}
