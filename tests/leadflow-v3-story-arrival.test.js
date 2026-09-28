const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html"),app=read("app.js"),css=read("styles.css");

test("automatic story playback waits for an arrival dwell in a central viewport band",()=>{
  assert.match(app,/function createStoryArrivalObserver/);
  assert.match(app,/dwellMs/);
  assert.match(app,/rootMargin/);
  assert.match(app,/arrivalTimer/);
  assert.doesNotMatch(app,/intersectionRatio>=\.42/);
  assert.doesNotMatch(app,/intersectionRatio>=\.3/);
  assert.doesNotMatch(app,/intersectionRatio>=\.22/);
});

test("workflow architecture and pending operations use the arrival observer",()=>{
  assert.match(app,/workflowStoryObserver=createStoryArrivalObserver/);
  assert.match(app,/architectureStoryObserver=createStoryArrivalObserver/);
  assert.match(app,/workspaceStoryObserver=createStoryArrivalObserver/);
  assert.match(app,/pendingOpsStory/);
  assert.match(app,/queueLeadOperationsStory/);
});

test("hero product-tour CTA is renamed and has strong visible styling",()=>{
  assert.ok(html.includes('id="guidedDemo"'));
  assert.match(html,/Watch LeadFlow in action/);
  assert.doesNotMatch(html,/Guided walkthrough/);
  assert.match(css,/\.hero-actions \.guided-btn\{[\s\S]*background:/);
  assert.match(css,/\.hero-actions \.guided-btn\{[\s\S]*border:/);
  assert.match(css,/\.guided-btn-play/);
});

test("tour status copy uses product-story language rather than walkthrough language",()=>{
  for(const text of ["LEAD JOURNEY","QUALIFICATION","DECISION","OPERATIONS","RECOVERY","SYSTEM TRACE"]){
    assert.ok(app.includes(text),text);
  }
  assert.doesNotMatch(app,/Walkthrough running/);
  assert.doesNotMatch(app,/Walkthrough complete/);
});

