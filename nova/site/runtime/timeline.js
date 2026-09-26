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
  // Hero opens as an intentional product detail, then resolves into a strong full silhouette.
  {p:0.00, pose:.24, pos:[.08,.10,0], scale:1.07, yaw:.18, pitch:-.035, cam:[-.10,.17,3.95], target:[-.24,.13,0], fov:25.5, exposure:1.04, hemi:1.65, key:5.0, fill:1.15, rim:8.2, warm:4.5, keyColor:0xfff0dc, rimColor:0xc77b4d, keyPos:[3.0,3.8,4.5], tone:0, spatial:0, spread:.45, adaptive:0, openness:.7, motion:.15},
  {p:0.06, pose:.27, pos:[.08,.08,0], scale:1.06, yaw:.10, pitch:-.02, cam:[-.05,.14,4.30], target:[-.22,.10,0], fov:26.2, exposure:1.06, hemi:1.8, key:4.8, fill:1.25, rim:7.9, warm:4.7, keyColor:0xfff0dc, rimColor:0xcd7949, keyPos:[3.3,4.0,4.9], tone:.02, spatial:0, spread:.48, adaptive:0, openness:.71, motion:.16},
  {p:0.12, pose:.30, pos:[.06,.04,0], scale:1.04, yaw:.03, pitch:0, cam:[.05,.08,4.82], target:[-.18,.08,0], fov:27.2, exposure:1.08, hemi:2.0, key:4.4, fill:1.4, rim:7.6, warm:4.8, keyColor:0xfff0dc, rimColor:0xd47f49, keyPos:[3.6,4.2,5.2], tone:.05, spatial:0, spread:.5, adaptive:0, openness:.72, motion:.18},

  // Design deliberately studies the earcup/cushion in a close three-quarter pass before settling.
  {p:0.16, pose:.28, pos:[.18,.02,0], scale:1.06, yaw:.27, pitch:-.032, cam:[-.32,.10,4.30], target:[-.18,.035,0], fov:25.8, exposure:1.10, hemi:1.85, key:5.1, fill:1.18, rim:9.0, warm:4.9, keyColor:0xffead6, rimColor:0xce7648, keyPos:[3.0,4.0,4.7], tone:.10, spatial:.01, spread:.53, adaptive:0, openness:.74, motion:.21},
  {p:0.20, pose:.26, pos:[.20,.01,0], scale:1.075, yaw:.29, pitch:-.038, cam:[-.36,.105,4.18], target:[-.19,.025,0], fov:25.4, exposure:1.11, hemi:1.75, key:5.35, fill:1.08, rim:9.6, warm:5.1, keyColor:0xffe8d1, rimColor:0xcb7143, keyPos:[2.8,3.9,4.5], tone:.13, spatial:.02, spread:.55, adaptive:0, openness:.75, motion:.24},
  {p:0.24, pose:.24, pos:[.20,.01,0], scale:1.075, yaw:.28, pitch:-.032, cam:[-.35,.105,4.22], target:[-.18,.025,0], fov:25.6, exposure:1.10, hemi:1.82, key:5.0, fill:1.15, rim:9.0, warm:4.9, keyColor:0xffead6, rimColor:0xce7648, keyPos:[3.0,4.0,4.8], tone:.15, spatial:.04, spread:.57, adaptive:0, openness:.75, motion:.23},
  {p:0.28, pose:.22, pos:[.19,.005,0], scale:1.07, yaw:.27, pitch:-.028, cam:[-.34,.103,4.29], target:[-.17,.024,0], fov:25.8, exposure:1.08, hemi:1.9, key:4.7, fill:1.25, rim:8.4, warm:4.8, keyColor:0xffead6, rimColor:0xce7648, keyPos:[3.2,4.0,5.0], tone:.18, spatial:.06, spread:.58, adaptive:0, openness:.76, motion:.22},

  // Spatial opens the field around an already large product instead of zooming it away.
  {p:0.32, pose:.72, pos:[.04,-.03,0], scale:1.05, yaw:.07, pitch:.008, cam:[-.12,.08,4.67], target:[.03,0,0], fov:27.2, exposure:1.13, hemi:1.45, key:5.0, fill:.88, rim:10.0, warm:5.4, keyColor:0xffdfc1, rimColor:0xc56a3d, keyPos:[2.9,3.8,4.7], tone:.62, spatial:.72, spread:.88, adaptive:0, openness:.82, motion:.50},
  {p:0.36, pose:.72, pos:[.02,-.04,0], scale:1.05, yaw:.04, pitch:.010, cam:[-.01,.07,4.73], target:[0,-.04,0], fov:27.2, exposure:1.17, hemi:1.18, key:5.25, fill:.70, rim:11.2, warm:5.8, keyColor:0xffd6ad, rimColor:0xbd6035, keyPos:[2.75,3.65,4.6], tone:.90, spatial:.92, spread:.98, adaptive:0, openness:.84, motion:.60},
  {p:0.45, pose:.72, pos:[.02,-.04,0], scale:1.05, yaw:.02, pitch:0, cam:[.03,.06,4.79], target:[0,-.02,0], fov:27.4, exposure:1.18, hemi:1.1, key:5.2, fill:.65, rim:11.6, warm:6.0, keyColor:0xffd3a8, rimColor:0xb95c32, keyPos:[2.7,3.6,4.6], tone:1, spatial:1, spread:1, adaptive:0, openness:.85, motion:.62},

  // Adaptive shifts attention toward the control surface, then clears the Form copy.
  {p:0.49, pose:.72, pos:[-.02,-.045,0], scale:1.05, yaw:-.16, pitch:.020, cam:[-.05,.05,4.47], target:[.10,-.03,0], fov:26.4, exposure:1.18, hemi:1.0, key:5.35, fill:.66, rim:11.3, warm:5.9, keyColor:0xffd5aa, rimColor:0xbb6036, keyPos:[2.7,3.55,4.5], tone:.98, spatial:.94, spread:.95, adaptive:.30, openness:.69, motion:.56},
  {p:0.54, pose:.72, pos:[-.035,-.05,0], scale:1.06, yaw:-.18, pitch:.025, cam:[-.13,.04,4.34], target:[.18,-.04,0], fov:26.0, exposure:1.17, hemi:.95, key:5.4, fill:.68, rim:11.0, warm:5.8, keyColor:0xffd6ac, rimColor:0xbc6338, keyPos:[2.75,3.55,4.55], tone:.96, spatial:.86, spread:.90, adaptive:.55, openness:.54, motion:.50},
  {p:0.58, pose:.74, pos:[0,-.05,0], scale:1.05, yaw:-.05, pitch:0, cam:[-.08,.04,4.72], target:[.02,-.03,0], fov:27.0, exposure:1.15, hemi:1.0, key:5.0, fill:.72, rim:10.5, warm:5.5, keyColor:0xffd8b1, rimColor:0xb9653d, keyPos:[2.9,3.5,4.8], tone:.9, spatial:.75, spread:.82, adaptive:.65, openness:.45, motion:.45},

  // Form and inspection are controlled physical studies, not decorative spins.
  {p:0.62, pose:.72, pos:[.02,-.045,0], scale:1.06, yaw:.18, pitch:.025, cam:[-.35,.10,4.38], target:[.05,0,0], fov:26.5, exposure:1.13, hemi:1.25, key:5.15, fill:.90, rim:9.8, warm:5.3, keyColor:0xffdfc1, rimColor:0xbd6840, keyPos:[3.0,3.65,4.8], tone:.70, spatial:.50, spread:.75, adaptive:.35, openness:.56, motion:.36},
  {p:0.67, pose:.72, pos:[.02,-.04,0], scale:1.07, yaw:.22, pitch:.03, cam:[-.38,.12,4.28], target:[.06,0,0], fov:26.3, exposure:1.12, hemi:1.45, key:5.0, fill:1.00, rim:9.3, warm:5.1, keyColor:0xffe2c7, rimColor:0xbf6c42, keyPos:[3.1,3.75,4.9], tone:.56, spatial:.36, spread:.70, adaptive:.24, openness:.62, motion:.31},
  {p:0.72, pose:.32, pos:[0,-.04,0], scale:1.05, yaw:.12, pitch:0, cam:[-.28,.08,4.62], target:[.03,-.02,0], fov:27.0, exposure:1.10, hemi:1.65, key:4.7, fill:1.1, rim:8.7, warm:5.0, keyColor:0xffe6ce, rimColor:0xc07045, keyPos:[3.2,3.8,5.0], tone:.42, spatial:.25, spread:.67, adaptive:.15, openness:.68, motion:.28},
  {p:0.76, pose:.28, pos:[0,-.015,0], scale:1.07, yaw:.08, pitch:.02, cam:[-.18,.08,4.28], target:[.02,.01,0], fov:26.2, exposure:1.10, hemi:1.72, key:4.9, fill:1.18, rim:8.8, warm:5.0, keyColor:0xffe8d2, rimColor:0xc37147, keyPos:[3.25,3.9,5.0], tone:.34, spatial:.18, spread:.63, adaptive:.08, openness:.70, motion:.24},
  {p:0.79, pose:.26, pos:[0,0,0], scale:1.08, yaw:.04, pitch:.015, cam:[-.10,.08,4.12], target:[.01,.02,0], fov:25.8, exposure:1.10, hemi:1.78, key:5.05, fill:1.20, rim:9.0, warm:5.05, keyColor:0xffead5, rimColor:0xc57348, keyPos:[3.3,3.95,5.0], tone:.28, spatial:.14, spread:.61, adaptive:.05, openness:.71, motion:.22},
  {p:0.83, pose:.24, pos:[0,0,0], scale:1.06, yaw:0, pitch:0, cam:[-.05,.07,4.36], target:[.01,.02,0], fov:26.4, exposure:1.09, hemi:1.84, key:4.8, fill:1.25, rim:8.5, warm:4.9, keyColor:0xffebd7, rimColor:0xc87549, keyPos:[3.35,4.0,5.1], tone:.22, spatial:.11, spread:.59, adaptive:.02, openness:.72, motion:.20},
  {p:0.86, pose:.24, pos:[0,.00,0], scale:1.05, yaw:0, pitch:0, cam:[0,.06,4.55], target:[0,.01,0], fov:27.0, exposure:1.08, hemi:1.9, key:4.5, fill:1.3, rim:7.8, warm:4.8, keyColor:0xffecd9, rimColor:0xca7447, keyPos:[3.4,4.0,5.3], tone:.16, spatial:.08, spread:.56, adaptive:0, openness:.74, motion:.18},

  // Resolution restores a bold commercial hero before the technical reveal intentionally recedes.
  {p:0.90, pose:.22, pos:[0,.015,0], scale:1.06, yaw:-.02, pitch:0, cam:[.08,.09,4.45], target:[0,.02,0], fov:26.8, exposure:1.08, hemi:1.95, key:4.65, fill:1.32, rim:8.0, warm:4.9, keyColor:0xffeedb, rimColor:0xcc774b, keyPos:[3.45,4.05,5.25], tone:.12, spatial:.04, spread:.53, adaptive:0, openness:.75, motion:.15},
  {p:0.945, pose:.20, pos:[0,.025,0], scale:1.07, yaw:-.04, pitch:0, cam:[.05,.10,4.38], target:[0,.03,0], fov:26.8, exposure:1.07, hemi:2.0, key:4.55, fill:1.35, rim:7.8, warm:4.8, keyColor:0xffefdc, rimColor:0xce794c, keyPos:[3.5,4.1,5.3], tone:.10, spatial:.01, spread:.51, adaptive:0, openness:.75, motion:.12},
  {p:0.96, pose:.20, pos:[0,.02,0], scale:1.06, yaw:-.03, pitch:0, cam:[.04,.10,4.58], target:[0,.02,0], fov:27.2, exposure:1.06, hemi:2.0, key:4.35, fill:1.35, rim:7.3, warm:4.6, keyColor:0xffefdc, rimColor:0xcf7a4d, keyPos:[3.5,4.1,5.4], tone:.08, spatial:0, spread:.5, adaptive:0, openness:.75, motion:.10},
  {p:1.00, pose:.16, pos:[.18,-.06,0], scale:.88, yaw:.06, pitch:0, cam:[.08,.10,5.8], target:[.06,-.03,0], fov:30, exposure:1.08, hemi:1.35, key:4.2, fill:.9, rim:8.0, warm:4.2, keyColor:0xffe6d2, rimColor:0xb86c40, keyPos:[3.1,3.7,5.0], tone:.55, spatial:.08, spread:.52, adaptive:0, openness:.7, motion:.08}
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

const PRODUCT_POSE_KEYFRAMES = [
  // Keep physical articulation narrative-led and single-directional:
  // stable Design study -> one opening action -> quiet product study -> final recession.
  [0.000,.240],[0.045,.270],[0.090,.290],[0.120,.300],
  [0.160,.300],[0.200,.300],[0.240,.300],[0.280,.300],
  [0.300,.400],[0.320,.520],[0.340,.640],[0.360,.720],
  [0.410,.730],[0.450,.740],
  [0.490,.735],[0.540,.725],[0.580,.720],
  [0.620,.720],[0.670,.720],[0.720,.720],
  [0.760,.720],[0.790,.720],[0.830,.720],[0.860,.720],
  [0.900,.720],[0.945,.720],[0.960,.720],
  [0.985,.670],[1.000,.640]
];

function sampleProductPose(progress){
  const p=clamp01(progress);
  for(let i=0;i<PRODUCT_POSE_KEYFRAMES.length-1;i++){
    const [ap,av]=PRODUCT_POSE_KEYFRAMES[i];
    const [bp,bv]=PRODUCT_POSE_KEYFRAMES[i+1];
    if(p<=bp){
      const t=smooth(clamp01((p-ap)/Math.max(.0001,bp-ap)));
      return lerp(av,bv,t);
    }
  }
  return PRODUCT_POSE_KEYFRAMES.at(-1)[1];
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
  const spatial=windowWeight(p,.28,.32,.43,.49);
  const adaptive=windowWeight(p,.42,.47,.535,.60);
  const resolution=windowWeight(p,.82,.87,.915,.965);
  const behind=ramp(p,.962,.988);

  // Camera framing does the heavy lifting so the product itself stays spatially stable.
  // Keep the full product silhouette inside the viewport during the Sound pass.
  // The previous -.54 target shift pushed the headphone above the top edge,
  // especially on short desktop and mobile viewports.
  state.camera.target[1] -= .16 * spatial;
  state.camera.position[2] += .26 * spatial;

  state.camera.target[0] += .58 * adaptive;
  // Keep the complete headband visible while the Control copy owns the right side.
  // The earlier downward target bias could push the crown above the viewport after damping.
  state.camera.target[1] += .08 * adaptive;
  state.camera.position[2] += .18 * adaptive;

  state.camera.target[0] -= .72 * resolution;
  state.camera.position[2] += .08 * resolution;
  state.product.scale *= lerp(1,.97,resolution);

  state.product.scale *= lerp(1,.55,behind);
  state.product.position[0] += .34 * behind;
  state.product.position[1] -= .12 * behind;
  state.camera.position[2] += .48 * behind;

  return state;
}

function viewportAdjusted(state, viewportClass){
  if(viewportClass === 'mobile'){
    state.camera.position[0] *= .24;
    state.camera.target[0] *= .12;
    // Mobile keeps a complete, legible product silhouette above the copy.
    // Do not park the rig beyond the top edge just to create negative space.
    state.camera.target[1] += .02;
    if(state.range === 'spatial') state.camera.target[1] += .012;
    state.product.position[0] *= .12;
    state.product.position[1] += .06;
    state.product.yaw *= .62;
    state.product.pitch *= .58;
    state.camera.position[2] += .94;
    state.camera.fov += 1.8;
  } else if(viewportClass === 'tablet'){
    state.camera.position[0] *= .68;
    state.camera.target[0] *= .68;
    state.product.position[0] *= .62;
    state.product.position[1] += .11;
    state.product.yaw *= .84;
    state.product.pitch *= .80;
    state.camera.position[2] += .22;
    state.camera.fov += .4;
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
      dark:rangeState.range === 'spatial' || rangeState.range === 'adaptive' || rangeState.range === 'behind',
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
