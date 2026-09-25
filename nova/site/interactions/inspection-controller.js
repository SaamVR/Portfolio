const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const VIEW_YAW={front:0,side:Math.PI*.48,rear:Math.PI};
const VIEW_SPRING_STIFFNESS=85;
const VIEW_SPRING_DAMPING=2*Math.sqrt(VIEW_SPRING_STIFFNESS);
const MAX_SPRING_STEP=1/60;

export function createInspectionController({maxYaw=.52,maxPitch=.12}={}){
  let active=false, dragging=false, pointerId=null, lastX=0,lastY=0,yaw=0,pitch=0,weight=0;
  let view='front',modelYaw=0,targetModelYaw=0,modelYawVelocity=0;
  return {
    setActive(value){
      active=!!value;
      if(!active){
        dragging=false;
        pointerId=null;
        view='front';
        targetModelYaw=0;
      }
    },
    setView(next){
      if(!(next in VIEW_YAW)) return;
      view=next;
      targetModelYaw=VIEW_YAW[next];
      yaw=0;
      pitch=0;
    },
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
    reset(){
      yaw=0;
      pitch=0;
      view='front';
      targetModelYaw=0;
    },
    update(dt){
      const step=Math.max(0,Number(dt)||0);
      const target=active?1:0;
      weight += (target-weight)*Math.min(1,step*7);
      let remaining=step;
      while(remaining>0){
        const springStep=Math.min(MAX_SPRING_STEP,remaining);
        const angularAcceleration=(targetModelYaw-modelYaw)*VIEW_SPRING_STIFFNESS-modelYawVelocity*VIEW_SPRING_DAMPING;
        modelYawVelocity += angularAcceleration*springStep;
        modelYaw += modelYawVelocity*springStep;
        remaining -= springStep;
      }
      if(Math.abs(targetModelYaw-modelYaw)<.0002 && Math.abs(modelYawVelocity)<.0005){
        modelYaw=targetModelYaw;
        modelYawVelocity=0;
      }
      if(!active){
        yaw*=Math.max(0,1-step*5);
        pitch*=Math.max(0,1-step*5);
      }
    },
    getInfluence(){ return {weight,yaw,pitch,modelYaw,view,active,dragging}; }
  };
}
