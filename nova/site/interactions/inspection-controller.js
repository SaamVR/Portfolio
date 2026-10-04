const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const VIEW_YAW={front:0,side:Math.PI*.48,rear:Math.PI};
const VIEW_SPRING_STIFFNESS=85;
const VIEW_SPRING_DAMPING=2*Math.sqrt(VIEW_SPRING_STIFFNESS);
const MAX_SPRING_STEP=1/120;

export function createInspectionController({maxYaw=.52,maxPitch=.12}={}){
  let active=false, dragging=false, pointerId=null, lastX=0,lastY=0;
  let yaw=0,pitch=0,yawTarget=0,pitchTarget=0,weight=0;
  let view='front',modelYaw=0,targetModelYaw=0,modelYawVelocity=0;
  let dragVelocity=0,pitchVelocity=0;

  return {
    setActive(value){
      const next=!!value;
      if(active===next) return;
      active=next;
      if(!active){
        dragging=false;
        pointerId=null;
        view='front';
        yawTarget=0;
        pitchTarget=0;
        dragVelocity=0;
        pitchVelocity=0;
        targetModelYaw=0;
      }else if(view==='front'){
        targetModelYaw=0;
      }
    },
    setView(next){
      if(!(next in VIEW_YAW)) return;
      view=next;
      targetModelYaw=VIEW_YAW[next];
      yawTarget=0;
      pitchTarget=0;
      dragVelocity=0;
      pitchVelocity=0;
    },
    pointerDown(x,y,id=0){
      if(!active) return;
      dragging=true;
      pointerId=id;
      lastX=x;
      lastY=y;
      dragVelocity=0;
      pitchVelocity=0;
    },
    pointerMove(x,y,id=0,viewport={width:1,height:1}){
      if(!dragging || id!==pointerId) return;
      this.dragBy(x-lastX,y-lastY,viewport);
      lastX=x;
      lastY=y;
    },
    pointerUp(id=0){
      if(id===pointerId){
        dragging=false;
        pointerId=null;
      }
    },
    dragBy(dx,dy,viewport={width:1,height:1}){
      if(!active) return;
      const w=Math.max(1,viewport.width||1);
      const h=Math.max(1,viewport.height||1);
      const deltaYaw=(dx/w)*1.8;
      const deltaPitch=(dy/h)*.8;
      yawTarget=clamp(yawTarget+deltaYaw,-maxYaw,maxYaw);
      pitchTarget=clamp(pitchTarget+deltaPitch,-maxPitch,maxPitch);
      yaw=yawTarget;
      pitch=pitchTarget;
      // A small release velocity makes direct inspection feel physical without
      // allowing the product to overshoot its bounded turntable limits.
      dragVelocity=deltaYaw*14;
      pitchVelocity=deltaPitch*14;
      weight=1;
    },
    reset(){
      // Preserve the visible angle while both manual offsets and the named
      // view ease toward neutral; a click must not produce an orientation cut.
      yawTarget=0;
      pitchTarget=0;
      dragVelocity=0;
      pitchVelocity=0;
      view='front';
      targetModelYaw=0;
    },
    update(dt){
      const step=Math.max(0,Number(dt)||0);
      const target=active?1:0;
      weight += (target-weight)*Math.min(1,step*7);

      if(active && !dragging){
        const inertiaDecay=Math.exp(-11*step);
        if(Math.abs(dragVelocity)>.0001 || Math.abs(pitchVelocity)>.0001){
          yawTarget=clamp(yawTarget+dragVelocity*step,-maxYaw,maxYaw);
          pitchTarget=clamp(pitchTarget+pitchVelocity*step,-maxPitch,maxPitch);
          dragVelocity*=inertiaDecay;
          pitchVelocity*=inertiaDecay;
        }
      }else if(!active){
        dragVelocity=0;
        pitchVelocity=0;
      }

      const dragRelease=1-Math.exp(-12*step);
      yaw += (yawTarget-yaw)*dragRelease;
      pitch += (pitchTarget-pitch)*dragRelease;

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

      if(!active && weight<=.001 && Math.abs(modelYaw)<.002 && Math.abs(modelYawVelocity)<.005){
        weight=0;
        yaw=0;
        pitch=0;
        yawTarget=0;
        pitchTarget=0;
        modelYaw=0;
        targetModelYaw=0;
        modelYawVelocity=0;
      }
    },
    settle(){
      modelYaw=targetModelYaw;modelYawVelocity=0;
      yaw=yawTarget;pitch=pitchTarget;dragVelocity=0;pitchVelocity=0;weight=active?1:0;
    },
    getInfluence(){
      return {weight,yaw,pitch,modelYaw,view,active,dragging};
    }
  };
}
