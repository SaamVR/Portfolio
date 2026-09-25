const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html");
const app=read("app.js");
const story=read("storytelling.js");
const css=read("styles.css");

test("root V3 user-facing copy avoids demo demonstration and showcase terminology",()=>{
  const visibleHtml=html
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ");
  for(const source of [visibleHtml,story]){
    for(const banned of [/\bdemo\b/i,/\bdemonstration\b/i,/\bshowcase\b/i,/PUBLIC DEMO/i,/DEMO CRM/i,/DEMO WORKSPACE/i,/DEMO CONTROLS/i,/DEMO PREFERENCES/i]){
      assert.doesNotMatch(source,banned,String(banned));
    }
  }
  for(const runtimePhrase of ["Demo data","demo CRM","public demo","demo workflow","demo 0.0s","interactive demo"]){
    assert.ok(!app.toLowerCase().includes(runtimePhrase.toLowerCase()),runtimePhrase);
  }
  assert.match(html,/Run the workflow/);
  assert.match(html,/Operations workspace/);
  assert.match(html,/Browser-local CRM/);
});

test("workflow token transforms meaning and semantic color across all four stages",()=>{
  for(const label of ["NEW INQUIRY","VERIFIED","SALES REVIEW"]){
    assert.ok(story.includes(label),label);
  }
  assert.match(story,/const scoreToken=.*" \/ 100"/);
  for(const tone of ["incoming","verified","priority","ready"]){
    assert.ok(story.includes('"'+tone+'"')||story.includes("'"+tone+"'"),tone);
    assert.match(css,new RegExp("\\.workflow-story-packet\\."+tone));
  }
  assert.match(story,/setWorkflowPacketState/);
  assert.match(story,/storyOptions\.onProgress/);
});

test("Lead Operations infographics expose replay motion and interactive emphasis hooks",()=>{
  for(const hook of [
    "animateOpsDistribution",
    "animateOpsScoreTrend",
    "animateOpsSourceQuality",
    "animateOpsUrgencyMix",
    "bindOpsInfographicInteractions"
  ]) assert.match(app,new RegExp(hook));
  assert.match(app,/data-ops-filter="status"/);
  assert.match(app,/data-ops-filter="source"/);
  assert.match(app,/data-ops-filter="urgency"/);
  assert.match(css,/\.ops-infographic-focus/);
  assert.match(css,/\.ops-infographic-dim/);
});

test("Scenario Story beats are directly interactive by pointer and keyboard",()=>{
  assert.equal((html.match(/data-incident-beat=/g)||[]).length,4);
  assert.equal((html.match(/class="incident-beat-button"/g)||[]).length,4);
  assert.match(app,/bindIncidentBeatInteractions/);
  assert.match(app,/selectIncidentBeat/);
  assert.match(app,/keydown/);
  assert.match(css,/\.incident-beat-button:focus-visible/);
});

test("Architecture trace uses semantic color states instead of one uniform accent",()=>{
  for(const tone of ["request","valid","score","crm-state","ready"]){
    assert.match(css,new RegExp("\\.arch-tone-"+tone.replace("-","\\-")));
  }
  for(const state of ["REQUEST","VALID","SCORE","CRM STATE","READY"]){
    assert.ok(story.includes(state),state);
  }
  assert.match(story,/setArchitectureTone/);
});

test("Architecture branch tokens merge away so READY owns the final state",()=>{
  assert.match(story,/rulesToken\.classList\.add\("merged"\)/);
  assert.match(story,/crmToken\.classList\.add\("merged"\)/);
  assert.match(css,/\.architecture-payload\.merged/);
  assert.match(css,/\.architecture-payload\.arch-tone-ready[\s\S]*z-index:/);
});

test("Scenario selectors use semantic tinted active states",()=>{
  assert.match(css,/data-edge="duplicate"\]\.active/);
  assert.match(css,/data-edge="review"\]\.active/);
  assert.match(css,/data-edge="timeout"\]\.active[\s\S]*background:#321A1B/);
});


test("Architecture READY token settles above the destination instead of covering node copy",()=>{
  assert.match(story,/function badgeAbove/);
  assert.match(story,/move\(main,api,nextBadge/);
});

test("Scenario Story has a neutral visual state before a scenario is selected",()=>{
  assert.match(html,/data-incident-scene="none"/);
  assert.match(html,/Choose a scenario/);
  assert.match(css,/\.incident-scene\.neutral-scene/);
});

test("manual Workflow and Architecture replay suppress automatic observer restart",()=>{
  assert.match(app,/workflowReplay[^\n]*workflowStoryPlayed=true/);
  assert.match(app,/workflowStoryObserver\?\.disconnect\(\)/);
  assert.match(app,/architectureReplay[^\n]*architectureStoryPlayed=true/);
  assert.match(app,/architectureStoryObserver\?\.disconnect\(\)/);
});
