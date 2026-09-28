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
  // 01 — Arrival: begin inside the product, then reveal the complete silhouette.
  {p:0.00, pose:.24, pos:[.08,.10,0], scale:1.07, yaw:.18, pitch:-.040, cam:[-.10,.17,3.88], target:[-.24,.13,0], fov:24.8, exposure:1.03, hemi:1.55, key:5.25, fill:1.05, rim:8.8, warm:4.6, keyColor:0xffefda, rimColor:0xc87343, keyPos:[2.75,3.75,4.2], tone:0, spatial:0, spread:.44, adaptive:0, openness:.70, motion:.10},
  {p:0.035, pose:.27, pos:[.08,.09,0], scale:1.07, yaw:.14, pitch:-.032, cam:[-.08,.155,4.02], target:[-.235,.115,0], fov:25.2, exposure:1.05, hemi:1.65, key:5.05, fill:1.12, rim:8.5, warm:4.7, keyColor:0xffefda, rimColor:0xca7646, keyPos:[2.95,3.85,4.45], tone:.01, spatial:0, spread:.46, adaptive:0, openness:.71, motion:.11},
  {p:0.075, pose:.29, pos:[.07,.07,0], scale:1.06, yaw:.09, pitch:-.018, cam:[-.03,.12,4.38], target:[-.215,.095,0], fov:26.0, exposure:1.06, hemi:1.78, key:4.75, fill:1.23, rim:8.1, warm:4.8, keyColor:0xfff0dc, rimColor:0xcd7949, keyPos:[3.25,4.0,4.8], tone:.025, spatial:0, spread:.48, adaptive:0, openness:.72, motion:.13},
  {p:0.12, pose:.30, pos:[.06,.04,0], scale:1.04, yaw:.03, pitch:0, cam:[.05,.08,4.82], target:[-.18,.08,0], fov:27.2, exposure:1.08, hemi:1.92, key:4.45, fill:1.36, rim:7.7, warm:4.8, keyColor:0xfff0dc, rimColor:0xd17c49, keyPos:[3.5,4.15,5.1], tone:.05, spatial:0, spread:.5, adaptive:0, openness:.72, motion:.15},

  // 02 — Design study: cushion -> hinge -> control surface. Source rig remains still.
  {p:0.145, pose:.30, pos:[.16,.025,0], scale:1.065, yaw:.23, pitch:-.032, cam:[-.27,.12,4.28], target:[-.18,.055,0], fov:24.9, exposure:1.10, hemi:1.82, key:5.15, fill:1.12, rim:9.2, warm:5.0, keyColor:0xffead3, rimColor:0xcc7243, keyPos:[2.9,4.0,4.55], tone:.09, spatial:.01, spread:.52, adaptive:0, openness:.74, motion:.16},
  {p:0.16, pose:.30, pos:[.18,.02,0], scale:1.075, yaw:.27, pitch:-.040, cam:[-.32,.10,4.15], target:[-.20,.015,0], fov:24.2, exposure:1.11, hemi:1.72, key:5.45, fill:1.03, rim:9.8, warm:5.2, keyColor:0xffe7cd, rimColor:0xc96f40, keyPos:[2.68,3.9,4.35], tone:.12, spatial:.015, spread:.54, adaptive:0, openness:.75, motion:.15},
  {p:0.185, pose:.30, pos:[.18,.018,0], scale:1.075, yaw:.27, pitch:-.038, cam:[-.31,.11,4.18], target:[-.17,.025,0], fov:24.3, exposure:1.11, hemi:1.72, key:5.35, fill:1.05, rim:9.7, warm:5.2, keyColor:0xffe8cf, rimColor:0xca7041, keyPos:[2.75,3.95,4.4], tone:.13, spatial:.02, spread:.55, adaptive:0, openness:.75, motion:.14},
  {p:0.205, pose:.30, pos:[.14,.015,0], scale:1.07, yaw:.18, pitch:-.018, cam:[-.18,.21,4.12], target:[-.16,.17,0], fov:24.3, exposure:1.10, hemi:1.74, key:5.5, fill:1.03, rim:10.0, warm:5.15, keyColor:0xffe8cf, rimColor:0xc86f42, keyPos:[2.55,4.25,4.4], tone:.14, spatial:.025, spread:.55, adaptive:0, openness:.75, motion:.13},
  {p:0.225, pose:.30, pos:[.14,.012,0], scale:1.07, yaw:.17, pitch:-.015, cam:[-.16,.20,4.15], target:[-.15,.16,0], fov:24.5, exposure:1.10, hemi:1.78, key:5.35, fill:1.08, rim:9.7, warm:5.05, keyColor:0xffead2, rimColor:0xca7244, keyPos:[2.65,4.2,4.5], tone:.145, spatial:.03, spread:.56, adaptive:0, openness:.75, motion:.12},
  {p:0.255, pose:.30, pos:[.19,.006,0], scale:1.075, yaw:.28, pitch:-.028, cam:[-.38,.07,4.16], target:[-.23,-.025,0], fov:24.4, exposure:1.11, hemi:1.76, key:5.55, fill:1.02, rim:10.1, warm:5.15, keyColor:0xffe6cc, rimColor:0xc76e40, keyPos:[2.72,3.78,4.35], tone:.155, spatial:.04, spread:.57, adaptive:0, openness:.76, motion:.13},
  {p:0.28, pose:.30, pos:[.18,.005,0], scale:1.07, yaw:.24, pitch:-.024, cam:[-.34,.10,4.28], target:[-.13,.04,0], fov:25.4, exposure:1.09, hemi:1.88, key:4.8, fill:1.22, rim:8.7, warm:4.9, keyColor:0xffead6, rimColor:0xce7648, keyPos:[3.08,4.0,4.85], tone:.18, spatial:.06, spread:.58, adaptive:0, openness:.76, motion:.15},

  // 03 — Wireless: one deliberate physical opening, then a quiet listening plateau.
  {p:0.30, pose:.40, pos:[.08,-.015,0], scale:1.065, yaw:.14, pitch:-.008, cam:[-.20,.09,4.42], target:[-.05,.02,0], fov:26.0, exposure:1.10, hemi:1.65, key:4.9, fill:1.00, rim:9.5, warm:5.1, keyColor:0xffe2c8, rimColor:0xc96e41, keyPos:[2.95,3.9,4.65], tone:.35, spatial:.32, spread:.68, adaptive:0, openness:.78, motion:.30},
  {p:0.32, pose:.52, pos:[.04,-.028,0], scale:1.06, yaw:.06, pitch:.002, cam:[-.13,.08,4.58], target:[.00,-.015,0], fov:26.5, exposure:1.12, hemi:1.48, key:5.0, fill:.88, rim:10.1, warm:5.35, keyColor:0xffddbb, rimColor:0xc26739, keyPos:[2.85,3.78,4.62], tone:.58, spatial:.68, spread:.86, adaptive:0, openness:.81, motion:.46},
  {p:0.34, pose:.64, pos:[.03,-.035,0], scale:1.055, yaw:.055, pitch:.008, cam:[-.06,.075,4.68], target:[.01,-.025,0], fov:26.8, exposure:1.15, hemi:1.30, key:5.15, fill:.78, rim:10.8, warm:5.55, keyColor:0xffd9b2, rimColor:0xbf6236, keyPos:[2.78,3.68,4.58], tone:.78, spatial:.86, spread:.94, adaptive:0, openness:.83, motion:.55},
  {p:0.36, pose:.72, pos:[.02,-.04,0], scale:1.055, yaw:.035, pitch:.010, cam:[0,.07,4.73], target:[0,-.04,0], fov:27.0, exposure:1.17, hemi:1.18, key:5.25, fill:.70, rim:11.2, warm:5.8, keyColor:0xffd6ad, rimColor:0xbd6035, keyPos:[2.75,3.65,4.6], tone:.90, spatial:.92, spread:.98, adaptive:0, openness:.84, motion:.58},
  {p:0.41, pose:.73, pos:[.02,-.04,0], scale:1.055, yaw:.02, pitch:.004, cam:[.02,.065,4.76], target:[0,-.03,0], fov:27.1, exposure:1.18, hemi:1.13, key:5.22, fill:.67, rim:11.5, warm:5.95, keyColor:0xffd4aa, rimColor:0xba5d33, keyPos:[2.72,3.62,4.6], tone:.97, spatial:.98, spread:1, adaptive:0, openness:.85, motion:.60},
  {p:0.45, pose:.74, pos:[.02,-.04,0], scale:1.055, yaw:.01, pitch:0, cam:[.03,.06,4.79], target:[0,-.02,0], fov:27.2, exposure:1.18, hemi:1.1, key:5.2, fill:.65, rim:11.6, warm:6.0, keyColor:0xffd3a8, rimColor:0xb95c32, keyPos:[2.7,3.6,4.6], tone:1, spatial:1, spread:1, adaptive:0, openness:.85, motion:.60},

  // 04 — Noise control: keep the listening shot family and move attention, not the whole product.
  {p:0.49, pose:.735, pos:[-.01,-.045,0], scale:1.055, yaw:-.11, pitch:.014, cam:[-.02,.055,4.54], target:[.08,-.025,0], fov:26.7, exposure:1.18, hemi:1.0, key:5.35, fill:.66, rim:11.3, warm:5.9, keyColor:0xffd5aa, rimColor:0xbb6036, keyPos:[2.7,3.55,4.5], tone:.98, spatial:.94, spread:.95, adaptive:.30, openness:.69, motion:.54},
  {p:0.54, pose:.725, pos:[-.02,-.05,0], scale:1.06, yaw:-.15, pitch:.018, cam:[-.10,.045,4.42], target:[.14,-.035,0], fov:26.3, exposure:1.17, hemi:.95, key:5.4, fill:.68, rim:11.0, warm:5.8, keyColor:0xffd6ac, rimColor:0xbc6338, keyPos:[2.75,3.55,4.55], tone:.96, spatial:.86, spread:.90, adaptive:.55, openness:.54, motion:.48},
  {p:0.58, pose:.72, pos:[0,-.045,0], scale:1.055, yaw:-.04, pitch:.003, cam:[-.06,.05,4.66], target:[.02,-.02,0], fov:26.8, exposure:1.15, hemi:1.02, key:5.0, fill:.74, rim:10.5, warm:5.5, keyColor:0xffd8b1, rimColor:0xb9653d, keyPos:[2.9,3.5,4.8], tone:.9, spatial:.75, spread:.82, adaptive:.65, openness:.45, motion:.43},

  // 05 — Flexibility: side the camera, fold mechanically, hold, then deliberately reopen.
  {p:0.62, pose:.72, pos:[.02,-.04,0], scale:1.065, yaw:.20, pitch:.018, cam:[-.34,.11,4.26], target:[.06,.015,0], fov:26.0, exposure:1.13, hemi:1.26, key:5.15, fill:.90, rim:9.8, warm:5.3, keyColor:0xffdfc1, rimColor:0xbd6840, keyPos:[3.0,3.65,4.8], tone:.70, spatial:.50, spread:.75, adaptive:.35, openness:.56, motion:.32},
  {p:0.65, pose:.62, pos:[.02,-.04,0], scale:1.07, yaw:.22, pitch:.018, cam:[-.35,.115,4.30], target:[.06,.02,0], fov:26.1, exposure:1.12, hemi:1.36, key:5.05, fill:.96, rim:9.5, warm:5.2, keyColor:0xffe0c3, rimColor:0xbe6a41, keyPos:[3.05,3.7,4.86], tone:.62, spatial:.42, spread:.72, adaptive:.29, openness:.60, motion:.28},
  {p:0.675, pose:.50, pos:[.02,-.035,0], scale:1.075, yaw:.22, pitch:.016, cam:[-.34,.12,4.38], target:[.055,.03,0], fov:26.3, exposure:1.11, hemi:1.46, key:4.95, fill:1.02, rim:9.2, warm:5.1, keyColor:0xffe2c7, rimColor:0xbf6c42, keyPos:[3.1,3.75,4.92], tone:.54, spatial:.34, spread:.69, adaptive:.23, openness:.63, motion:.20},
  {p:0.69, pose:.50, pos:[.02,-.035,0], scale:1.075, yaw:.20, pitch:.012, cam:[-.31,.115,4.42], target:[.05,.03,0], fov:26.4, exposure:1.11, hemi:1.50, key:4.9, fill:1.05, rim:9.0, warm:5.05, keyColor:0xffe3c9, rimColor:0xc06d43, keyPos:[3.15,3.78,4.96], tone:.50, spatial:.30, spread:.68, adaptive:.20, openness:.65, motion:.14},
  {p:0.705, pose:.61, pos:[.015,-.038,0], scale:1.065, yaw:.16, pitch:.008, cam:[-.28,.10,4.48], target:[.04,.005,0], fov:26.6, exposure:1.10, hemi:1.58, key:4.8, fill:1.08, rim:8.9, warm:5.0, keyColor:0xffe5cc, rimColor:0xc16f44, keyPos:[3.18,3.8,5.0], tone:.46, spatial:.27, spread:.67, adaptive:.17, openness:.67, motion:.18},
  {p:0.72, pose:.72, pos:[0,-.035,0], scale:1.055, yaw:.10, pitch:.002, cam:[-.23,.08,4.55], target:[.025,-.01,0], fov:26.8, exposure:1.10, hemi:1.65, key:4.7, fill:1.1, rim:8.7, warm:5.0, keyColor:0xffe6ce, rimColor:0xc07045, keyPos:[3.2,3.8,5.0], tone:.42, spatial:.25, spread:.67, adaptive:.15, openness:.68, motion:.22},

  // 06 — Inspection: arrive centered, stop authored motion, hand control to the visitor.
  {p:0.76, pose:.72, pos:[0,-.012,0], scale:1.075, yaw:.06, pitch:.014, cam:[-.16,.08,4.24], target:[.015,.01,0], fov:25.9, exposure:1.10, hemi:1.72, key:4.9, fill:1.18, rim:8.8, warm:5.0, keyColor:0xffe8d2, rimColor:0xc37147, keyPos:[3.25,3.9,5.0], tone:.34, spatial:.18, spread:.63, adaptive:.08, openness:.70, motion:.16},
  {p:0.79, pose:.72, pos:[0,0,0], scale:1.085, yaw:.025, pitch:.008, cam:[-.08,.08,4.08], target:[.005,.02,0], fov:25.6, exposure:1.10, hemi:1.78, key:5.05, fill:1.20, rim:9.0, warm:5.05, keyColor:0xffead5, rimColor:0xc57348, keyPos:[3.3,3.95,5.0], tone:.28, spatial:.14, spread:.61, adaptive:.05, openness:.71, motion:.12},
  {p:0.83, pose:.72, pos:[0,0,0], scale:1.075, yaw:0, pitch:0, cam:[-.03,.07,4.26], target:[0,.02,0], fov:26.1, exposure:1.09, hemi:1.84, key:4.8, fill:1.25, rim:8.5, warm:4.9, keyColor:0xffebd7, rimColor:0xc87549, keyPos:[3.35,4.0,5.1], tone:.22, spatial:.11, spread:.59, adaptive:.02, openness:.72, motion:.10},
  {p:0.86, pose:.72, pos:[0,.00,0], scale:1.06, yaw:0, pitch:0, cam:[0,.065,4.48], target:[0,.01,0], fov:26.7, exposure:1.08, hemi:1.9, key:4.5, fill:1.3, rim:7.8, warm:4.8, keyColor:0xffecd9, rimColor:0xca7447, keyPos:[3.4,4.0,5.3], tone:.16, spatial:.08, spread:.56, adaptive:0, openness:.74, motion:.08},

  // 07 — Commercial resolution: clean launch-poster silhouette and practical specs.
  {p:0.90, pose:.72, pos:[0,.015,0], scale:1.07, yaw:-.02, pitch:0, cam:[.07,.09,4.34], target:[0,.02,0], fov:26.3, exposure:1.08, hemi:1.95, key:4.65, fill:1.32, rim:8.0, warm:4.9, keyColor:0xffeedb, rimColor:0xcc774b, keyPos:[3.45,4.05,5.25], tone:.12, spatial:.04, spread:.53, adaptive:0, openness:.75, motion:.06},
  {p:0.945, pose:.72, pos:[0,.025,0], scale:1.08, yaw:-.035, pitch:0, cam:[.04,.10,4.28], target:[0,.03,0], fov:26.2, exposure:1.07, hemi:2.0, key:4.55, fill:1.35, rim:7.8, warm:4.8, keyColor:0xffefdc, rimColor:0xce794c, keyPos:[3.5,4.1,5.3], tone:.10, spatial:.01, spread:.51, adaptive:0, openness:.75, motion:.05},
  {p:0.96, pose:.72, pos:[0,.02,0], scale:1.065, yaw:-.025, pitch:0, cam:[.04,.10,4.52], target:[0,.02,0], fov:26.8, exposure:1.06, hemi:2.0, key:4.35, fill:1.35, rim:7.3, warm:4.6, keyColor:0xffefdc, rimColor:0xcf7a4d, keyPos:[3.5,4.1,5.4], tone:.08, spatial:0, spread:.5, adaptive:0, openness:.75, motion:.04},

  // 08 — Behind the build: product deliberately recedes so the case study owns hierarchy.
  {p:1.00, pose:.64, pos:[.18,-.06,0], scale:.88, yaw:.06, pitch:0, cam:[.08,.10,5.8], target:[.06,-.03,0], fov:30, exposure:1.08, hemi:1.35, key:4.2, fill:.9, rim:8.0, warm:4.2, keyColor:0xffe6d2, rimColor:0xb86c40, keyPos:[3.1,3.7,5.0], tone:.55, spatial:.08, spread:.52, adaptive:0, openness:.7, motion:.03}
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
  // The supplied clip contains unrelated expansion/twist takes outside the
  // clean hinge window. Keep the product mechanically stable at .37 and use
  // only the verified .37 -> .43 segment for the fold demonstration.
  [0.000,.370],[0.620,.370],
  [0.645,.385],[0.675,.430],[0.690,.430],[0.705,.395],[0.720,.370],
  [0.960,.370],[0.985,.400],[1.000,.430]
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
  const heroFit=windowWeight(p,.045,.075,.11,.145);
  const overviewFit=windowWeight(p,.255,.31,.635,.675);
  const inspectionFit=windowWeight(p,.70,.755,.945,.965);
  const spatial=windowWeight(p,.28,.32,.43,.49);
  const adaptive=windowWeight(p,.42,.47,.535,.60);
  const formEntry=windowWeight(p,.56,.595,.635,.675);
  const inspection=windowWeight(p,.70,.755,.845,.875);
  const resolution=windowWeight(p,.82,.87,.915,.965);
  const behind=ramp(p,.962,.988);

  // Story framing policy:
  // - Hero opens as a recognizable macro and resolves to the complete silhouette.
  // - Design stays deliberately close for material/hinge/control studies.
  // - Sound, Control and the open Form entry become full-product reading shots.
  // - 360° inspection and Specifications keep the whole silhouette inside frame.
  // Camera distance does the work first so the headphone keeps physical scale.
  state.camera.position[2] += .95 * heroFit;
  state.camera.position[2] += 1.25 * overviewFit;
  state.camera.position[2] += 1.55 * inspectionFit;

  // Environment chapters create negative space with optics/targeting rather than
  // large product translations. Keep the crown and both earcups readable.
  state.camera.target[1] -= .08 * spatial;
  state.product.position[1] += .08 * spatial;

  // Noise-control copy lives on the right: bias the complete product left.
  state.camera.target[0] += .48 * adaptive;
  state.camera.target[1] += .05 * adaptive;

  // Flexibility copy lives on the left while the open product begins the fold.
  // As the rig becomes physically compact, this offset eases away.
  state.product.position[0] += .20 * formEntry;

  // Direct inspection needs a clean copy/product split before the visitor takes
  // over the turntable.
  state.product.position[0] += .28 * inspection;

  // Final launch poster keeps product to the right of the headline.
  state.camera.target[0] -= .66 * resolution;
  state.product.position[0] += .10 * resolution;
  state.product.scale *= lerp(1,.985,resolution);

  // Only the technical handoff is allowed to make the product clearly secondary.
  state.product.scale *= lerp(1,.55,behind);
  state.product.position[0] += .34 * behind;
  state.product.position[1] -= .12 * behind;
  state.camera.position[2] += .48 * behind;

  return state;
}

function viewportAdjusted(state, viewportClass){
  if(viewportClass === 'mobile'){
    state.camera.position[0] *= .22;
    state.camera.target[0] *= .11;
    state.camera.target[1] += .025;
    if(state.range === 'spatial') state.camera.target[1] += .012;
    state.product.position[0] *= .10;
    state.product.position[1] += .065;
    state.product.yaw *= .58;
    state.product.pitch *= .54;
    state.camera.position[2] += 1.00;
    state.camera.fov += 2.0;
  } else if(viewportClass === 'tablet'){
    state.camera.position[0] *= .66;
    state.camera.target[0] *= .66;
    state.product.position[0] *= .60;
    state.product.position[1] += .10;
    state.product.yaw *= .82;
    state.product.pitch *= .78;
    state.camera.position[2] += .26;
    state.camera.fov += .5;
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
      settled:rangeState.progress > .28 && rangeState.progress < .84,
      transition:
        rangeState.range === 'design' && rangeState.progress > .82 ? 'to-dark' :
        rangeState.range === 'adaptive' && rangeState.progress > .82 ? 'to-light' :
        rangeState.range === 'resolution' && rangeState.progress > .78 ? 'to-dark' :
        'none'
    }
  };
  return viewportAdjusted(applyCompositionInfluences(state,p), viewportClass);
}
