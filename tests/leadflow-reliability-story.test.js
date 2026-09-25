const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const story=fs.readFileSync(path.join(root,"storytelling.js"),"utf8");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");

test("reliability has a four-beat incident rail and scenario scenes",()=>{
  assert.equal((html.match(/data-incident-beat=/g)||[]).length,4);
  for(const scenario of ["duplicate","timeout","review"]){
    assert.ok(html.includes('data-incident-scene="'+scenario+'"'),scenario);
  }
  assert.ok(html.includes('id="incidentBoundary"'));
});

test("timeout story keeps the connected-delivery boundary explicit",()=>{
  assert.ok(story.includes("DELIVERY RETRY REQUIRES A CONNECTED CRM"));
  assert.ok(story.includes("durable retry state"));
  assert.ok(story.includes("idempotent delivery"));
});

test("reliability director has truthful duplicate review and timeout beats",()=>{
  for(const text of ["Existing record matched","No duplicate row","Human review selected","Timeout detected","Retry plan prepared"]){
    assert.ok(story.includes(text),text);
  }
  assert.match(story,/incidentScenario/);
});

test("scenario buttons use the shared reliability director",()=>{
  assert.match(app,/function playReliabilityStory/);
  assert.match(app,/storyDirector\?\.playReliabilityStory/);
  assert.match(app,/renderReliabilityLog/);
});

