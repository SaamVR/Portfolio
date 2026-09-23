const clamp01=v=>Math.max(0,Math.min(1,v));

export function createHotspotController({THREE,camera,anchors={},elements={}}={}){
  if(!THREE?.Vector3) throw new Error('hotspot controller requires THREE.Vector3');
  const world=new THREE.Vector3();
  const boundsBox=THREE.Box3 ? new THREE.Box3() : null;
  let focused=null;
  let weight=0;

  const getElement=id => elements instanceof Map ? elements.get(id) : elements[id];

  return {
    focus(id){
      if(anchors[id]) focused=id;
    },
    clear(){
      focused=null;
      weight=0;
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
          const x=(world.x*.5+.5+(screenOffset[0]||0))*width;
          const y=(-world.y*.5+.5+(screenOffset[1]||0))*height;
          el.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
        }
        el.setAttribute?.('aria-expanded',String(focused===id));
      }
      const target=focused?1:0;
      weight += (target-weight)*Math.min(1,Math.max(0,dt)*8);
    },
    getInfluence(){
      const anchor=focused?anchors[focused]:null;
      return {
        weight:clamp01(weight),
        id:focused,
        cameraOffset:[...(anchor?.cameraOffset||[0,0,0])],
        targetOffset:[...(anchor?.targetOffset||[0,0,0])]
      };
    }
  };
}
