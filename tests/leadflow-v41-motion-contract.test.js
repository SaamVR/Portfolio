const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");

test("guided tour settles camera before every chapter action",()=>{
  assert.match(app,/function waitForTourScrollSettle\(/);
  assert.match(app,/async function scrollTourTargetSettled\(/);
  for(const selector of ["#workflow","#demo","#resultCard","#workspace","#reliability","#architecture"]){
    const escaped=selector.replace("#","\\#");
    assert.match(app,new RegExp('await scrollTourTargetSettled\\("'+escaped+'"\\)'));
  }
});

test("reveal stagger is local to each card group",()=>{
  assert.doesNotMatch(app,/revealTargets\.forEach\(\(el,i\)=>[\s\S]{0,400}\(i%3\)\+1/);
  assert.match(app,/revealGroups/);
  assert.match(app,/Math\.min\(index\+1,4\)/);
});
test("entrance-only reveal delay is cleared after reveal settles",()=>{
  assert.match(app,/delete\s+entry\.target\.dataset\.revealDelay/);
  assert.match(app,/transitionend/);
});

test("ambient CSS motion has one hero followup timeline and no dead pulse",()=>{
  const heroFrames=(css.match(/@keyframes\s+heroFollowupState/g)||[]).length;
  assert.equal(heroFrames,1);
  assert.doesNotMatch(css,/animation\s*:\s*pulse\s+1s\s+infinite/);
});
test("camera settle prefers native scrollend with frame fallback",()=>{
  assert.match(app,/"onscrollend"\s+in\s+window/);
  assert.match(app,/addEventListener\("scrollend"/);
  assert.match(app,/requestAnimationFrame\(sample\)/);
});
test("cancelling the guided tour stops in-flight camera motion",()=>{
  assert.match(app,/function stopTourScroll\(/);
  const endTour=app.match(/function endTour\(\)\{[\s\S]*?\n\}/)?.[0]||"";
  assert.match(endTour,/stopTourScroll\(\)/);
  assert.match(app,/scrollTo\(\{top:scrollY,left:scrollX,behavior:"auto"\}\)/);
});
test("tour scroll cancellation covers the native scroll startup race",()=>{
  const stop=app.match(/function stopTourScroll\(\)\{[\s\S]*?\n\}/)?.[0]||"";
  assert.match(stop,/requestAnimationFrame/);
  assert.match(stop,/halt/);
});
test("guided tour owns scroll anchoring only while active",()=>{
  assert.match(app,/classList\.add\("guided-tour-active"\)/);
  assert.match(app,/classList\.remove\("guided-tour-active"\)/);
  assert.match(css,/\.guided-tour-active\s*\{[^}]*overflow-anchor\s*:\s*none/);
});

test("external story interruption exits guided mode cleanly",()=>{
  assert.match(app,/function guidedStoryInterrupted\(/);
  assert.match(app,/storyResult\?\.status==="cancelled"/);
  const uses=(app.match(/guidedStoryInterrupted\(storyResult\)/g)||[]).length;
  assert.ok(uses>=4,uses);
});
