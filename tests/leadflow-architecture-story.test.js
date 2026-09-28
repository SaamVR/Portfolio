const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const story=fs.readFileSync(path.join(root,"storytelling.js"),"utf8");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");

test("architecture story exposes trace UI and replay",()=>{
  for(const id of ["architectureStoryCaption","architectureStoryDetail","architectureReplay","architecturePayload","architectureRulesPayload","architectureCrmPayload"]){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  for(const node of ["input","api","rules","crm","next"]){
    assert.ok(html.includes('data-arch-node="'+node+'"'),node);
  }
});

test("architecture director includes branch and reconvergence story beats",()=>{
  for(const text of ["Validate request","Score intent + budget + urgency","Persist browser-local state","Reconverge score + CRM state","Prepare next action"]){
    assert.ok(story.includes(text),text);
  }
  assert.match(story,/architectureDirector/);
  assert.match(story,/arch-branch-active/);
  assert.match(story,/arch-reconverged/);
});

test("architecture replay and one-shot observer use the shared director",()=>{
  assert.match(app,/function playArchitectureStory/);
  assert.match(app,/architectureStoryObserver/);
  assert.match(app,/architectureReplay/);
  assert.match(app,/storyDirector\?\.playArchitectureStory/);
});

test("architecture trace styling includes payload branch and reduced motion",()=>{
  assert.match(css,/\.architecture-story-head/);
  assert.match(css,/\.architecture-payload/);
  assert.match(css,/\.architecture\.arch-branch-active/);
  assert.match(css,/\.architecture\.arch-reconverged/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*\.architecture-payload/);
});

