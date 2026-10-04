// Small, time-based secondary movement; the typography stays anchored.
export function applyLivingMotion(state,time,{reducedMotion=false,inspectionWeight=0,hotspotWeight=0}={}){
  if(reducedMotion || state.range==='inspect') return state;
  const weight=(1-Math.max(0,Math.min(1,inspectionWeight)))*(1-Math.max(0,Math.min(1,hotspotWeight)));
  state.product.position[1]+=(.055*Math.sin(time*.85)+.014*Math.sin(time*1.7+.5))*weight;
  state.product.pitch+=.012*Math.sin(time*.67+.5)*weight;
  state.product.yaw+=.018*Math.sin(time*.43)*weight;
  state.product.inspectionYaw+=(.08*Math.sin(time*.53)+.022*Math.sin(time*1.1))*weight;
  state.lighting.keyPosition[0]+=.24*Math.sin(time*.37)*weight;
  return state;
}
