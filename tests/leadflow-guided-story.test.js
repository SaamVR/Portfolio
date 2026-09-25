const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");

test("guided UI exposes chapter beat and within-chapter progress",()=>{
  for(const id of ["tourIndex","tourChapter","tourBeat","tourProgressBar"]){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
});

test("guided walkthrough awaits the shared story directors",()=>{
  assert.match(app,/await playWorkflowStory\(/);
  assert.match(app,/await playLeadOperationsStory\(/);
  assert.match(app,/await playReliabilityStory\("timeout",/);
  assert.match(app,/await playArchitectureStory\(/);
  assert.match(app,/await waitForWorkflowCompletion\(\)/);
  assert.doesNotMatch(app,/visitTourStep\("#workflow"/);
  assert.doesNotMatch(app,/visitTourStep\("#workspace"/);
  assert.doesNotMatch(app,/visitTourStep\("#reliability"/);
  assert.doesNotMatch(app,/visitTourStep\("#architecture"/);
});

test("guided cancellation aborts all story directors and clears story focus",()=>{
  assert.match(app,/storyDirector\?\.cancelAll\(\)/);
  assert.match(app,/function endTour/);
  assert.match(app,/resetTourFocus\(\)/);
});

test("guided chapter copy describes the six storytelling chapters",()=>{
  for(const text of ["FOLLOW THE LEAD","RUN IT FOR REAL","WHY 92?","OPERATIONS","SAFETY","UNDER THE HOOD"]){
    assert.ok(app.includes(text),text);
  }
});

