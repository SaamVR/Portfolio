const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a,b,t) => a + (b-a) * t;
const smooth = t => t*t*(3-2*t);

export function createFoldController({openPose=.20, foldedPose=.40, duration=.7}={}){
  let active=false, mode='open', weight=0, elapsed=0, startPose=openPose, targetPose=openPose, currentPose=openPose;
  let releasing=false;
  return {
    begin(nextMode, pose){
      mode = nextMode === 'fold' ? 'fold' : 'open';
      active = true;
      releasing = false;
      elapsed = 0;
      startPose = Number.isFinite(pose) ? pose : currentPose;
      currentPose = startPose;
      targetPose = mode === 'fold' ? foldedPose : openPose;
      weight = Math.max(weight, .001);
    },
    update(dt,{scrollActive=false,timelinePose=currentPose}={}){
      const step=Math.max(0,Number(dt)||0);
      if(scrollActive && active) releasing=true;
      if(releasing){
        weight = Math.max(0, weight - step * 2.6);
        currentPose = lerp(currentPose, timelinePose, clamp01(step*4));
        if(weight<=.001){ weight=0; active=false; releasing=false; }
        return;
      }
      if(active){
        elapsed += step;
        const t=smooth(clamp01(elapsed/Math.max(.001,duration)));
        currentPose=lerp(startPose,targetPose,t);
        weight=Math.min(1,weight+step*4);
      }
    },
    getInfluence(){
      return {weight,targetPose:currentPose,active,mode};
    }
  };
}
