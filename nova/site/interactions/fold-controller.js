export function createFoldController({openPose=.20,foldedPose=.40,duration=.7}={}){
  let active=false,mode='open',weight=0,currentPose=openPose,targetPose=openPose,velocity=0,releasing=false;
  const omega=8/Math.max(.25,duration);
  return {
    begin(nextMode,pose){
      mode=nextMode==='fold'?'fold':'open';
      if(!active){currentPose=Number.isFinite(pose)?pose:currentPose;velocity=0;}
      targetPose=mode==='fold'?foldedPose:openPose;
      active=true;releasing=false;weight=1;
    },
    update(dt,{scrollActive=false}={}){
      const step=Math.max(0,Number(dt)||0);
      if(scrollActive&&active) releasing=true;
      if(releasing){
        // Release ownership, not geometry: the composer restores the scroll pose.
        weight=Math.max(0,weight-step*2.6);
        if(weight===0){active=false;releasing=false;velocity=0;}
        return;
      }
      if(!active)return;
      let remaining=step;
      while(remaining>0){
        const dt=Math.min(1/120,remaining);
        velocity+=((targetPose-currentPose)*omega*omega-2*omega*velocity)*dt;
        currentPose+=velocity*dt;
        remaining-=dt;
      }
      if(Math.abs(targetPose-currentPose)<.0002&&Math.abs(velocity)<.001){currentPose=targetPose;velocity=0;}
    },
    settle(){currentPose=targetPose;velocity=0;},
    getInfluence(){return {weight,targetPose:currentPose,active,mode};}
  };
}
