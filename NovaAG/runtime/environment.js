const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:min));

export function normalizeEnvironmentState(state={}){
  return {
    tone:clamp(state.tone??0,0,1),
    spatialAmount:clamp(state.spatialAmount??0,0,1),
    spatialSpread:clamp(state.spatialSpread??.5,.25,2),
    adaptiveAmount:clamp(state.adaptiveAmount??0,0,1),
    openness:clamp(state.openness??.7,0,1),
    motion:clamp(state.motion??0,0,1)
  };
}

export function createEnvironment(scene,THREE){
  const group=new THREE.Group();
  group.name='NOVAEnvironment';
  group.position.z=-1.7;
  const lines=[];
  const radii=[1.15,1.65,2.2,2.85];
  for(let i=0;i<radii.length;i++){
    const points=[];
    const segments=96;
    for(let s=0;s<segments;s++){
      const a=(s/segments)*Math.PI*2;
      points.push(new THREE.Vector3(Math.cos(a)*radii[i],Math.sin(a)*radii[i],0));
    }
    const geometry=new THREE.BufferGeometry().setFromPoints(points);
    const material=new THREE.LineBasicMaterial({color:i%2?0xa66c45:0x8e9baa,transparent:true,opacity:0});
    const line=new THREE.LineLoop(geometry,material);
    line.rotation.x=(i%2?-.06:.04);
    group.add(line);
    lines.push(line);
  }
  scene.add(group);
  let phase=0;
  return {
    apply(raw,dt=1/60){
      const state=normalizeEnvironmentState(raw);
      phase+=Math.max(0,dt)*state.motion*.35;
      group.rotation.z=phase*.08;
      group.scale.setScalar(.78+state.spatialSpread*.22);
      lines.forEach((line,i)=>{
        const base=(.045+i*.018)*state.spatialAmount;
        const adaptiveBoost=state.adaptiveAmount*(i<2?.055:.018);
        line.material.opacity=Math.min(.19,base+adaptiveBoost);
        const squeeze=1-state.adaptiveAmount*.18;
        const open=1+(state.openness-.5)*.18;
        line.scale.set(squeeze*open,open,1);
      });
      group.visible=state.spatialAmount>.01||state.adaptiveAmount>.01;
    },
    resize(){},
    dispose(){
      for(const line of lines){line.geometry.dispose();line.material.dispose();}
      group.removeFromParent();
    }
  };
}
