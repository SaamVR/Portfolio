const clamp = (v,min,max) => Math.max(min,Math.min(max,v));

export function createInspectionController({maxYaw=.52,maxPitch=.12}={}){
  let active=false, dragging=false, pointerId=null, lastX=0,lastY=0,yaw=0,pitch=0,weight=0;
  return {
    setActive(value){ active=!!value; if(!active){dragging=false;pointerId=null;} },
    pointerDown(x,y,id=0){ if(!active) return; dragging=true; pointerId=id; lastX=x; lastY=y; },
    pointerMove(x,y,id=0,viewport={width:1,height:1}){
      if(!dragging || id!==pointerId) return;
      this.dragBy(x-lastX,y-lastY,viewport);
      lastX=x; lastY=y;
    },
    pointerUp(id=0){ if(id===pointerId){dragging=false;pointerId=null;} },
    dragBy(dx,dy,viewport={width:1,height:1}){
      if(!active) return;
      const w=Math.max(1,viewport.width||1), h=Math.max(1,viewport.height||1);
      yaw=clamp(yaw + (dx/w)*1.8,-maxYaw,maxYaw);
      pitch=clamp(pitch + (dy/h)*.8,-maxPitch,maxPitch);
      weight=1;
    },
    reset(){ yaw=0; pitch=0; weight=active?1:0; },
    update(dt){
      const step=Math.max(0,Number(dt)||0);
      const target=active?1:0;
      weight += (target-weight)*Math.min(1,step*7);
      if(!active){ yaw*=Math.max(0,1-step*5); pitch*=Math.max(0,1-step*5); }
    },
    getInfluence(){ return {weight,yaw,pitch,active,dragging}; }
  };
}
