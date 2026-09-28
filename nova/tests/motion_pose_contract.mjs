import assert from 'node:assert/strict';
import { sampleTimeline } from '../site/runtime/timeline.js';

function samples(start,end,count=81){
  return Array.from({length:count},(_,i)=>{
    const p=start+(end-start)*(i/(count-1));
    return {p,pose:sampleTimeline(p,'desktop').product.pose};
  });
}
function analyze(rows,epsilon=.0005){
  const values=rows.map(r=>r.pose);
  let reversals=0, previousSign=0;
  for(let i=1;i<values.length;i++){
    const d=values[i]-values[i-1];
    if(Math.abs(d)<=epsilon) continue;
    const sign=Math.sign(d);
    if(previousSign && sign!==previousSign) reversals++;
    previousSign=sign;
  }
  return {min:Math.min(...values),max:Math.max(...values),span:Math.max(...values)-Math.min(...values),reversals};
}
function assertMonotonic(rows,direction,label,tolerance=.0007){
  for(let i=1;i<rows.length;i++){
    const d=rows[i].pose-rows[i-1].pose;
    if(direction==='up') assert.ok(d>=-tolerance, label+' must not visibly close while opening');
    else assert.ok(d<=tolerance, label+' must not visibly reopen while resolving');
  }
}

const design=analyze(samples(.12,.28));
assert.ok(design.span<=.006,'Design detail sequence should hold a mechanically stable product pose');

const spatialRows=samples(.28,.45);
const spatial=analyze(spatialRows);
assert.ok(spatial.span<=.006,'Sound should keep the source rig stable while camera/light communicate the listening state');
assert.equal(spatial.reversals,0,'Sound should not scrub unrelated source animation');

const adaptiveRows=samples(.45,.58);
const adaptive=analyze(adaptiveRows);
assert.ok(adaptive.span<=.006,'Noise-control should keep the source rig stable');
assert.equal(adaptive.reversals,0,'Noise-control should not pulse the headphone open/closed');

const formRows=samples(.58,.72);
const form=analyze(formRows);
assert.ok(form.span>=.055 && form.span<=.065,'Form must use only the verified .37-.43 hinge window');
assert.equal(form.reversals,1,'Form should have exactly one fold-to-reopen reversal');
assert.ok(sampleTimeline(.675,'desktop').product.pose>=.428,'Form should reach the folded hinge state');
assert.ok(sampleTimeline(.72,'desktop').product.pose<=.372,'Form should reopen before inspection');

const inspect=analyze(samples(.72,.86));
assert.ok(inspect.span<=.018,'Inspect should keep physical articulation stable while Front/Side/Rear own rotation');
assert.equal(inspect.reversals,0,'Inspect pose should not breathe open/closed during view rotation');

const resolution=analyze(samples(.86,.96));
assert.ok(resolution.span<=.018,'Resolution should present a stable commercial hero before the technical reveal');
assert.equal(resolution.reversals,0,'Resolution pose should not pulse before the final recession');

const behindRows=samples(.96,1);
assertMonotonic(behindRows,'up','Behind handoff');
const behind=analyze(behindRows);
assert.equal(behind.reversals,0,'Behind handoff should close/recede in one direction');

for(const {pose} of samples(0,1,1001)){
  assert.ok(pose>=.369&&pose<=.431,'V7 must never leave the verified source hinge window');
}

console.log('motion_pose_contract_v7: PASS',JSON.stringify({design,spatial,adaptive,form,inspect,resolution,behind}));
