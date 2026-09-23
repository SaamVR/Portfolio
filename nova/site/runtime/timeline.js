export const EXPERIENCE_RANGES = {
  hero:[0,.12],
  design:[.12,.28],
  spatial:[.28,.45],
  adaptive:[.45,.58],
  form:[.58,.72],
  inspect:[.72,.86],
  resolution:[.86,.96],
  behind:[.96,1]
};

const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const lerp = (a,b,t) => a + (b-a) * t;
const lerp3 = (a,b,t) => a.map((v,i) => lerp(v,b[i],t));
const smooth = t => t*t*(3-2*t);
const ramp = (p,start,end) => smooth(clamp01((p-start)/Math.max(.0001,end-start)));
const windowWeight = (p,inStart,inEnd,outStart,outEnd) =>
  ramp(p,inStart,inEnd) * (1-ramp(p,outStart,outEnd));

const KEYFRAMES = [
  {p:0.00, pose:.24, pos:[0,.04,0], scale:1, yaw:0, pitch:0, cam:[0,.10,4.45], target:[0,.08,0], fov:27, exposure:1.02, hemi:1.7, key:4.7, fill:1.1, rim:7.0, warm:4.0, keyColor:0xfff0dc, rimColor:0xc77b4d, keyPos:[3.1,3.7,4.8], tone:0, spatial:0, spread:.45, adaptive:0, openness:.7, motion:.15},
  {p:0.12, pose:.30, pos:[0,.02,0], scale:1, yaw:.02, pitch:0, cam:[.05,.06,5.55], target:[0,.03,0], fov:30, exposure:1.08, hemi:2.0, key:4.3, fill:1.4, rim:7.5, warm:4.8, keyColor:0xfff0dc, rimColor:0xd47f49, keyPos:[3.6,4.2,5.5], tone:.05, spatial:0, spread:.5, adaptive:0, openness:.72, motion:.18},
  {p:0.28, pose:.22, pos:[.10,.00,0], scale:1, yaw:.18, pitch:0, cam:[-.36,.10,5.08], target:[.08,.02,0], fov:29.5, exposure:1.08, hemi:1.9, key:4.6, fill:1.25, rim:8.2, warm:4.8, keyColor:0xffead6, rimColor:0xce7648, keyPos:[3.2,4.0,5.0], tone:.18, spatial:.06, spread:.58, adaptive:0, openness:.76, motion:.22},
  {p:0.45, pose:.72, pos:[.02,-.04,0], scale:1, yaw:.02, pitch:0, cam:[.05,.05,5.22], target:[0,-.02,0], fov:29, exposure:1.18, hemi:1.1, key:5.2, fill:.65, rim:11.6, warm:6.0, keyColor:0xffd3a8, rimColor:0xb95c32, keyPos:[2.7,3.6,4.6], tone:1, spatial:1, spread:1, adaptive:0, openness:.85, motion:.62},
  {p:0.58, pose:.74, pos:[0,-.05,0], scale:1, yaw:-.02, pitch:0, cam:[-.08,.03,5.18], target:[0,-.03,0], fov:29, exposure:1.15, hemi:1.0, key:5.0, fill:.72, rim:10.5, warm:5.5, keyColor:0xffd8b1, rimColor:0xb9653d, keyPos:[2.9,3.5,4.8], tone:.9, spatial:.75, spread:.82, adaptive:.65, openness:.45, motion:.45},
  {p:0.72, pose:.32, pos:[0,-.04,0], scale:1, yaw:.12, pitch:0, cam:[-.30,.08,5.10], target:[.03,-.02,0], fov:29.5, exposure:1.10, hemi:1.65, key:4.7, fill:1.1, rim:8.7, warm:5.0, keyColor:0xffe6ce, rimColor:0xc07045, keyPos:[3.2,3.8,5.0], tone:.42, spatial:.25, spread:.67, adaptive:.15, openness:.68, motion:.28},
  {p:0.86, pose:.24, pos:[0,.00,0], scale:1, yaw:0, pitch:0, cam:[0,.06,5.25], target:[0,.01,0], fov:29.5, exposure:1.08, hemi:1.9, key:4.5, fill:1.3, rim:7.8, warm:4.8, keyColor:0xffecd9, rimColor:0xca7447, keyPos:[3.4,4.0,5.3], tone:.16, spatial:.08, spread:.56, adaptive:0, openness:.74, motion:.18},
  {p:0.96, pose:.20, pos:[0,.02,0], scale:.98, yaw:-.03, pitch:0, cam:[.05,.08,5.55], target:[0,.02,0], fov:30.5, exposure:1.06, hemi:2.0, key:4.25, fill:1.35, rim:7.2, warm:4.6, keyColor:0xffefdc, rimColor:0xcf7a4d, keyPos:[3.5,4.1,5.4], tone:.08, spatial:0, spread:.5, adaptive:0, openness:.75, motion:.10},
  {p:1.00, pose:.16, pos:[.18,-.06,0], scale:.88, yaw:.06, pitch:0, cam:[.08,.10,5.8], target:[.06,-.03,0], fov:31, exposure:1.08, hemi:1.35, key:4.2, fill:.9, rim:8.0, warm:4.2, keyColor:0xffe6d2, rimColor:0xb86c40, keyPos:[3.1,3.7,5.0], tone:.55, spatial:.08, spread:.52, adaptive:0, openness:.7, motion:.08}
];

export function getGlobalProgress(scrollY, scrollHeight, viewportHeight){
  return clamp01(scrollY / Math.max(1, scrollHeight - viewportHeight));
}

export function getRangeState(progress){
  const p = clamp01(progress);
  for (const [range,[start,end]] of Object.entries(EXPERIENCE_RANGES)) {
    if (p <= end || range === 'behind') {
      return { range, progress: clamp01((p-start) / Math.max(.0001, end-start)) };
    }
  }
  return { range:'behind', progress:1 };
}

function sampleProductPose(progress){
  const p=clamp01(progress);
  if(p<=.12) return lerp(.24,.30,smooth(p/.12));
  if(p<=.28) return lerp(.30,.24,smooth((p-.12)/.16));
  if(p<=.32) return lerp(.24,.72,smooth((p-.28)/.04));
  if(p<=.96) return .72;
  return lerp(.72,.64,smooth((p-.96)/.04));
}

function segment(progress){
  const p = clamp01(progress);
  for(let i=0;i<KEYFRAMES.length-1;i++){
    const a=KEYFRAMES[i], b=KEYFRAMES[i+1];
    if(p <= b.p) return [a,b,smooth(clamp01((p-a.p)/Math.max(.0001,b.p-a.p)))];
  }
  return [KEYFRAMES.at(-2),KEYFRAMES.at(-1),1];
}

function applyCompositionInfluences(state,p){
  const spatial=windowWeight(p,.24,.30,.43,.49);
  const adaptive=windowWeight(p,.42,.47,.57,.63);
  const resolution=windowWeight(p,.82,.87,.96,1.0);
  const behind=ramp(p,.935,.975);

  // Camera framing does the heavy lifting so the product itself stays spatially stable.
  state.camera.target[1] -= .62 * spatial;
  state.camera.position[2] += .34 * spatial;

  state.camera.target[0] += .58 * adaptive;
  state.camera.target[1] -= .12 * adaptive;
  state.camera.position[2] += .18 * adaptive;

  state.camera.target[0] -= .90 * resolution;
  state.camera.position[2] += .24 * resolution;
  state.product.scale *= lerp(1,.90,resolution);

  state.product.scale *= lerp(1,.72,behind);
  state.camera.position[2] += .12 * behind;

  return state;
}

function viewportAdjusted(state, viewportClass){
  if(viewportClass === 'mobile'){
    state.camera.position[0] *= .35;
    state.camera.target[0] *= .35;
    state.camera.target[1] -= .16;
    state.product.position[0] *= .25;
    state.product.position[1] += .34;
    state.camera.position[2] += 1.0;
    state.camera.fov += 1.0;
  } else if(viewportClass === 'tablet'){
    state.camera.position[0] *= .7;
    state.camera.target[0] *= .7;
    state.product.position[0] *= .65;
    state.product.position[1] += .12;
    state.camera.position[2] += .35;
  }
  return state;
}

export function sampleTimeline(progress, viewportClass='desktop'){
  const p = clamp01(progress);
  const [a,b,t] = segment(p);
  const rangeState = getRangeState(p);
  const state = {
    progress:p,
    range:rangeState.range,
    rangeProgress:rangeState.progress,
    product:{
      pose:sampleProductPose(p),
      position:lerp3(a.pos,b.pos,t),
      scale:lerp(a.scale,b.scale,t),
      yaw:lerp(a.yaw,b.yaw,t),
      pitch:lerp(a.pitch,b.pitch,t)
    },
    camera:{
      position:lerp3(a.cam,b.cam,t),
      target:lerp3(a.target,b.target,t),
      fov:lerp(a.fov,b.fov,t)
    },
    lighting:{
      exposure:lerp(a.exposure,b.exposure,t), hemi:lerp(a.hemi,b.hemi,t),
      key:lerp(a.key,b.key,t), fill:lerp(a.fill,b.fill,t), rim:lerp(a.rim,b.rim,t), warm:lerp(a.warm,b.warm,t),
      keyColor:t<.5?a.keyColor:b.keyColor, rimColor:t<.5?a.rimColor:b.rimColor,
      keyPosition:lerp3(a.keyPos,b.keyPos,t)
    },
    environment:{
      tone:lerp(a.tone,b.tone,t), spatialAmount:lerp(a.spatial,b.spatial,t), spatialSpread:lerp(a.spread,b.spread,t),
      adaptiveAmount:lerp(a.adaptive,b.adaptive,t), openness:lerp(a.openness,b.openness,t), motion:lerp(a.motion,b.motion,t)
    },
    ui:{
      range:rangeState.range,
      dark:rangeState.range === 'spatial' || rangeState.range === 'adaptive',
      settled:rangeState.progress > .32 && rangeState.progress < .82,
      transition:
        rangeState.range === 'design' && rangeState.progress > .82 ? 'to-dark' :
        rangeState.range === 'adaptive' && rangeState.progress > .82 ? 'to-light' :
        rangeState.range === 'resolution' && rangeState.progress > .78 ? 'to-dark' :
        'none'
    }
  };
  return viewportAdjusted(applyCompositionInfluences(state,p), viewportClass);
}
