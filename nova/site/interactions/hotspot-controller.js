const clamp01=v=>Math.max(0,Math.min(1,v));
const easeVec=(current,target,alpha)=>{
  for(let i=0;i<3;i++) current[i] += ((target?.[i]||0)-current[i])*alpha;
};

export function createHotspotController({THREE,camera,anchors={},elements={}}={}){
  if(!THREE?.Vector3) throw new Error('hotspot controller requires THREE.Vector3');
  const world=new THREE.Vector3();
  const boundsBox=THREE.Box3 ? new THREE.Box3() : null;
  const currentCameraOffset=[0,0,0];
  const currentTargetOffset=[0,0,0];
  let focused=null;
  let weight=0;

  const getElement=id => elements instanceof Map ? elements.get(id) : elements[id];

  return {
    focus(id){
      if(anchors[id]) focused=id;
    },
    clear(){
      focused=null;
    },
    update({modelRoot,viewport={width:1,height:1},dt=1/60}={}){
      const width=Math.max(1,viewport.width||1);
      const height=Math.max(1,viewport.height||1);
      for(const [id,anchor] of Object.entries(anchors)){
        const el=getElement(id);
        if(!el) continue;
        if(anchor.boundsObject && boundsBox){
          boundsBox.setFromObject(anchor.boundsObject,true).getCenter(world);
        }else if(anchor.mesh?.getVertexPosition && Number.isInteger(anchor.vertexIndex)){
          anchor.mesh.getVertexPosition(anchor.vertexIndex,world);
          anchor.mesh.localToWorld?.(world);
        }else if(anchor.object?.localToWorld){
          world.fromArray(anchor.offset||[0,0,0]);
          anchor.object.localToWorld(world);
        }else if(anchor.object?.getWorldPosition){
          anchor.object.getWorldPosition(world);
        }else{
          world.fromArray(anchor.point||[0,0,0]);
          modelRoot?.localToWorld?.(world);
        }
        world.project(camera);
        const visible=Number.isFinite(world.x)&&Number.isFinite(world.y)&&world.z>=-1.2&&world.z<=1.2&&Math.abs(world.x)<=1.15&&Math.abs(world.y)<=1.15;
        el.dataset.visible=String(visible);
        if(visible){
          const screenOffset=anchor.screenOffset||[0,0];
          const rawX=(world.x*.5+.5+(screenOffset[0]||0))*width;
          const rawY=(-world.y*.5+.5+(screenOffset[1]||0))*height;
          const safeInset=Math.min(16,width*.08,height*.08);
          const x=Math.max(safeInset,Math.min(width-safeInset,rawX));
          const y=Math.max(safeInset,Math.min(height-safeInset,rawY));
          el.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
        }
        el.setAttribute?.('aria-expanded',String(focused===id));
      }

      const step=Math.max(0,Number(dt)||0);
      const alpha=Math.min(1,step*7);
      const targetWeight=focused?1:0;
      weight += (targetWeight-weight)*alpha;

      const anchor=focused?anchors[focused]:null;
      easeVec(currentCameraOffset,anchor?.cameraOffset||[0,0,0],alpha);
      easeVec(currentTargetOffset,anchor?.targetOffset||[0,0,0],alpha);

      if(!focused && weight<.001){
        weight=0;
        currentCameraOffset.fill(0);
        currentTargetOffset.fill(0);
      }
    },
    getInfluence(){
      return {
        weight:clamp01(weight),
        id:focused,
        cameraOffset:[...currentCameraOffset],
        targetOffset:[...currentTargetOffset]
      };
    }
  };
}
