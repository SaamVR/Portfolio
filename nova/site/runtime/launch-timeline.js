// One measured chapter, one product benefit, one move and a deliberate hold.
export const EXPERIENCE_RANGES={hero:[0,.12],design:[.12,.28],spatial:[.28,.45],adaptive:[.45,.58],form:[.58,.72],inspect:[.72,.86],resolution:[.86,1]};
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const mix=(a,b,t)=>a+(b-a)*t;
const vec=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
const color=(a,b,t)=>[16,8,0].reduce((n,shift)=>n+(Math.round(mix((a>>shift)&255,(b>>shift)&255,t))<<shift),0);
const SHOTS={
  hero:{pos:[0,0,0],scale:1,yaw:0,pitch:0,turn:-.42,cam:[0,.04,9.2],target:[-1.65,0,0],fov:32,tone:0,spatial:0,adaptive:0},
  design:{pos:[0,0,0],scale:1.03,yaw:0,pitch:0,turn:-.68,cam:[-.08,.04,9.0],target:[-1.75,-.02,0],fov:32,tone:0,spatial:0,adaptive:0},
  spatial:{pos:[0,0,0],scale:1,yaw:0,pitch:0,turn:-.20,cam:[0,.05,9.4],target:[-1.65,0,0],fov:32,tone:1,spatial:1,adaptive:0},
  adaptive:{pos:[0,0,0],scale:1,yaw:0,pitch:0,turn:1.18,cam:[0,.05,9.2],target:[1.6,0,0],fov:32,tone:1,spatial:.22,adaptive:1},
  form:{pos:[0,0,0],scale:1,yaw:0,pitch:0,turn:-.50,cam:[0,.05,9.2],target:[-1.65,0,0],fov:32,tone:0,spatial:0,adaptive:0},
  inspect:{pos:[0,0,0],scale:1,yaw:0,pitch:0,turn:0,cam:[0,0,9.5],target:[1.65,0,0],fov:32,tone:0,spatial:0,adaptive:0},
  resolution:{pos:[0,0,0],scale:1,yaw:0,pitch:0,turn:-.32,cam:[0,.05,9.2],target:[-1.65,0,0],fov:32,tone:0,spatial:0,adaptive:0}
};
export function getRangeState(progress){
  const p=clamp(progress);
  for(const [range,[start,end]] of Object.entries(EXPERIENCE_RANGES)){
    if(p<end || range==='resolution') return {range,progress:clamp((p-start)/(end-start))};
  }
}
export function getSectionProgress(scrollY,sections){
  if(!sections.length) return 0;
  const y=Math.max(0,scrollY||0);
  const section=sections.find(s=>y<s.end)||sections.at(-1);
  const [start,end]=EXPERIENCE_RANGES[section.range];
  return mix(start,end,clamp((y-section.top)/Math.max(1,section.end-section.top)));
}
export function progressToScroll(progress,sections){
  const {range,progress:local}=getRangeState(progress);
  const section=sections.find(s=>s.range===range);
  return section?mix(section.top,section.end,local):0;
}
export function sampleTimeline(progress,viewport='desktop',dimensions={}){
  const p=clamp(progress),{range,progress:local}=getRangeState(p);
  const names=Object.keys(SHOTS),index=names.indexOf(range);
  const a=SHOTS[names[Math.max(0,index-1)]],b=SHOTS[range];
  // Every new composition resolves in the entry beat; the body remains still.
  const t=index===0?1:ease(local/.24);
  const dark=mix(a.tone,b.tone,t);
  const state={progress:p,range,rangeProgress:local,
    product:{pose:.72,position:vec(a.pos,b.pos,t),scale:mix(a.scale,b.scale,t),yaw:mix(a.yaw,b.yaw,t),pitch:mix(a.pitch,b.pitch,t),inspectionYaw:mix(a.turn,b.turn,t),inspectionPitch:0},
    camera:{position:vec(a.cam,b.cam,t),target:vec(a.target,b.target,t),fov:mix(a.fov,b.fov,t)},
    lighting:{exposure:mix(1.05,1.16,dark),hemi:mix(1.9,1.0,dark),key:4.5,fill:mix(1.2,.62,dark),rim:mix(5.5,9,dark),warm:mix(3,4,dark),keyColor:color(0xfff1df,0xffd3a7,dark),rimColor:color(0xc89266,0xd37d46,dark),keyPosition:[3.3,4,5.1]},
    environment:{tone:dark,spatialAmount:mix(a.spatial,b.spatial,t),spatialSpread:.9,adaptiveAmount:mix(a.adaptive,b.adaptive,t),openness:.72,motion:.12},
    ui:{range,dark:dark>.5,settled:local>.24&&local<.88,transition:'none',opacity:range==='hero'?1-ease((local-.88)/.12):ease(local/.16)*(range==='resolution'?1:1-ease((local-.88)/.12))}
  };
  if(range==='hero') state.camera.position[2]-=.18*ease(local);
  if(range==='form'){
    // Fold -> hold -> reopen. Manual controls can take ownership at any point.
    const folded=ease((local-.28)/.18)*(1-ease((local-.70)/.16));
    state.product.pose=mix(.72,.50,folded);
  }
  if(viewport==='mobile'){
    state.camera.position=[0,.04,12.8];state.camera.target=[0,-1.9,0];state.camera.fov=36;
    state.product.scale=.72;state.product.inspectionYaw*=.8;
    if(dimensions.height && dimensions.height<720){state.product.scale=.64;state.camera.target[1]=-2.0;}
  }else if(viewport==='tablet'){
    state.camera.position[2]+=.4;state.camera.target[0]*=.65;state.product.scale=.94;
  }
  return state;
}
