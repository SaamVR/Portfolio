const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a,b,t) => a + (b-a) * t;
const smooth = t => t*t*(3-2*t);

export function createFoldController({openPose=.20, foldedPose=.40, duration=.7}={}){
  let active=false, mode='open', weight=0, elapsed=0, startPose=openPose, targetPose=openPose, currentPose=openPose, currentVelocity=0, startVelocity=0;
  let releasing=false;
  return {
    begin(nextMode, pose){
      const wasActive=active;
      mode = nextMode === 'fold' ? 'fold' : 'open';
      active = true;
      releasing = false;
      elapsed = 0;
      startPose = Number.isFinite(pose) ? pose : currentPose;
      currentPose = startPose;
      startVelocity = wasActive ? currentVelocity : 0;
      targetPose = mode === 'fold' ? foldedPose : openPose;
      weight = Math.max(weight, .001);
    },
    update(dt,{scrollActive=false,timelinePose=currentPose}={}){
      const step=Math.max(0,Number(dt)||0);
      if(scrollActive && active && !releasing){
        releasing=true;
        currentVelocity=0;
        startVelocity=0;
      }
      if(releasing){
        weight = Math.max(0, weight - step * 2.6);
        if(weight<=.001){
          weight=0;
          active=false;
          releasing=false;
          currentPose=timelinePose;
          currentVelocity=0;
          startVelocity=0;
        }
        return;
      }
      if(active){
        elapsed += step;
        const span=Math.max(.001,duration);
        const t=clamp01(elapsed/span);
        const t2=t*t, t3=t2*t;
        const h00=2*t3-3*t2+1;
        const h10=t3-2*t2+t;
        const h01=-2*t3+3*t2;
        currentPose=h00*startPose+h10*span*startVelocity+h01*targetPose;
        currentVelocity=((6*t2-6*t)/span)*startPose+(3*t2-4*t+1)*startVelocity+((-6*t2+6*t)/span)*targetPose;
        if(t>=1) currentVelocity=0;
        weight=Math.min(1,weight+step*4);
      }
    },
    getInfluence(){
      return {weight,targetPose:currentPose,active,mode};
    }
  };
}
