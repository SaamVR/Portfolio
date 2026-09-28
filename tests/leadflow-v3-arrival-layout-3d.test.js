const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html"),app=read("app.js"),css=read("styles.css");

test("story sections replay on every arrival after one second unless guided tour owns motion",()=>{
  assert.match(app,/createStoryArrivalObserver/);
  assert.match(app,/dwellMs=1000/);
  assert.match(app,/if\(!inBand\|\|guided\)return/);
  assert.match(app,/if\(inBand&&!guided\)onArrive\?\.\(\)/);
  assert.match(app,/createStoryArrivalObserver\(\$\("#workflow"\)/);
  assert.match(app,/createStoryArrivalObserver\(\$\("#workspace"\)/);
  assert.match(app,/createStoryArrivalObserver\(\$\("#reliability"\)/);
  assert.match(app,/createStoryArrivalObserver\(\$\("#architecture"\)/);
  assert.doesNotMatch(app,/workflowStoryObserver\?\.disconnect\(\)/);
  assert.doesNotMatch(app,/architectureStoryObserver\?\.disconnect\(\)/);
});

test("replay controls are icon-only but remain accessible",()=>{
  for(const id of ["workflowReplay","opsStoryReplay","architectureReplay"]){
    const m=html.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>[\\s\\S]*?<\\/button>'));
    assert.ok(m,id);
    assert.match(m[0],/aria-label=/);
    assert.match(m[0],/title=/);
    assert.doesNotMatch(m[0],/Replay (flow|impact|trace)/i);
    assert.match(m[0],/>↻<|>⟳<|>↺</);
  }
  assert.match(css,/\.story-replay\.icon-only/);
});

test("TRY THE WORKFLOW has a viewport-fit desktop layout",()=>{
  assert.match(css,/@media\(min-width:1081px\) and \(min-height:760px\)/);
  assert.match(css,/#demo\{[\s\S]*min-height:calc\(100svh - 76px\)/);
  assert.match(css,/#demo \.demo-layout\{[\s\S]*grid-template-columns:/);
  assert.match(css,/#demo \.(lead-form|execution-card)/);
  assert.match(css,/#demo \.event-log\{max-height:/);
});

test("Reliability uses semantic 3D cards and scenario-specific palettes",()=>{
  assert.match(css,/--incident-tone:/);
  assert.match(css,/perspective:/);
  assert.match(css,/\.incident-rail article\{[\s\S]*box-shadow:/);
  assert.match(css,/\.incident-beat-button\.incident-focus\{[\s\S]*transform:/);
  assert.match(css,/#reliability\[data-incident-scenario="duplicate"\][\s\S]*--incident-tone:/);
  assert.match(css,/#reliability\[data-incident-scenario="timeout"\][\s\S]*--incident-tone:/);
  assert.match(css,/#reliability\[data-incident-scenario="review"\][\s\S]*--incident-tone:/);
});

