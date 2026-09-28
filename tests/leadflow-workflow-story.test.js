const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const story=fs.readFileSync(path.join(root,"storytelling.js"),"utf8");

test("workflow story exposes packet captions stages and replay",()=>{
  for(const id of ["workflowStoryPacket","workflowStoryCaption","workflowStoryDetail","workflowReplay"]){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.equal((html.match(/workflow-stage/g)||[]).length,4);
  assert.equal((html.match(/workflow-story-connector/g)||[]).length,3);
});

test("workflow director has meaningful stage captions and settles",()=>{
  for(const text of ["Inquiry received","Input verified","High priority"]){
    assert.ok(story.toLowerCase().includes(text.toLowerCase()),text);
  }
  assert.match(story,/routeLabel\(lead\)\+" ready"/);
  assert.match(story,/section\.dataset\.storyState/);
  assert.match(story,/story-connector-complete/);
});

test("workflow story auto-plays once and replay uses same director",()=>{
  assert.match(app,/workflowStoryObserver/);
  assert.match(app,/playWorkflowStory/);
  assert.match(app,/workflowReplay/);
  assert.match(app,/workflowStoryLead/);
});

test("workflow explanatory connector animation does not loop indefinitely",()=>{
  assert.match(css,/#workflow \.workflow-story-connector i\s*\{[^}]*animation:\s*none!important/);
  assert.match(css,/\.story-connector-complete i/);
  assert.match(css,/\.workflow-story-track/);
});

