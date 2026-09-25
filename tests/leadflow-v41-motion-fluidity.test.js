const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const app=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");

test("guided tour waits for camera travel to settle before every chapter action",()=>{
  assert.match(app,/async function scrollTourTarget\(/);
  assert.match(app,/waitForTourScrollSettle/);
  for(const selector of ["#workflow","#demo","#resultCard","#workspace","#reliability","#architecture"]){
    const escaped=selector.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&");
    assert.match(app,new RegExp('await scrollTourTarget\\("'+escaped+'"\\)'),selector);
  }
});
test("guided tour camera settling is cancellable and bounded",()=>{
  assert.match(app,/function waitForTourScrollSettle\(/);
  assert.match(app,/requestAnimationFrame/);
  assert.match(app,/cancelled/);
  assert.match(app,/timeout/);
});
test("guided qualification progress reads the real six-stage execution container",()=>{
  assert.match(app,/\$\$\("#steps \.exec-step\.done"\)\.length/);
  assert.doesNotMatch(app,/#executionSteps/);
});
test("reveal staggering restarts inside each card group",()=>{
  assert.match(app,/\["\.brief-grid","\.workflow-map","\.implementation-proof"\]/);
  assert.match(app,/querySelectorAll\(":scope > article"\)/);
  assert.match(app,/String\(index\+1\)/);
  assert.doesNotMatch(app,/revealTargets\.forEach\(\(el,i\)=>[\s\S]{0,400}i%3/);
});