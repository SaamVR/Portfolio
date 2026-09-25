const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("index.html"),css=read("styles.css"),app=read("app.js"),story=read("storytelling.js");

test("hero and capability bridge use presentation-grade readable hierarchy",()=>{
  assert.match(css,/\.hero-proof\{[^}]*font-size:\s*1[12](?:\.\d+)?px/i);
  assert.match(css,/\.trust-band[^}]*background/);
  assert.match(css,/\.capability:hover/);
});

test("business problem cards use semantic friction system oversight accents",()=>{
  assert.match(css,/\.brief-grid article:nth-child\(1\)::before[^}]*#?FF|var\(--red\)/i);
  assert.match(css,/\.brief-grid article:nth-child\(2\)::before[^}]*accent/i);
  assert.match(css,/\.brief-grid article:nth-child\(3\)::before[^}]*amber/i);
});

test("Lead Operations copy is product language rather than presentation language",()=>{
  assert.doesNotMatch(html,/interactive workflow/i);
  assert.match(html,/qualification workflow|lead workflow/i);
});

test("reliability visually connects Trigger Detection Response Final state",()=>{
  assert.match(css,/\.incident-rail::before/);
  assert.match(css,/incident-progress/i);
});

test("architecture support copy and semantic path are deliberately legible",()=>{
  assert.match(css,/#architecture \[data-arch-node\] span[^}]*font-size:\s*1[23]/);
  assert.match(css,/\.arch-tone-request/);
  assert.match(css,/\.arch-tone-ready/);
});

test("ROI changes animate as a before-after-value story",()=>{
  assert.match(app,/function animateRoiUpdate/);
  assert.match(app,/function animateRoiNumber/);
  assert.match(css,/\.roi-updated/);
  assert.match(css,/@keyframes roiResultPulse/);
});

test("collapsed blueprint explains trigger rules action before expansion",()=>{
  for(const word of ["Trigger","Rules","Action"]) assert.ok(html.includes(word),word);
  assert.match(html,/blueprint-summary-flow/);
  assert.match(css,/\.blueprint-summary-flow/);
});

test("lower-page product story is framed as operational product ecosystem",()=>{
  assert.match(html,/NEXT OPERATIONAL SYSTEM/);
  assert.match(html,/Run the workflow/);
  assert.match(css,/\.case-section[^}]*background/);
});


test("mobile storytelling geometry adapts instead of compressing desktop motion",()=>{
  assert.match(css,/@media\(max-width:680px\)[\s\S]*\.flow-orbit\{[^}]*display:grid/);
  assert.match(css,/@media\(max-width:680px\)[\s\S]*#workflow \.workflow-stage\{[^}]*min-height:\s*190px/);
  assert.match(css,/@media\(max-width:680px\)[\s\S]*\.incident-rail::before\{[^}]*width:\s*2px[^}]*height:var\(--incident-progress/);
  assert.match(story,/function branchDock/);
  assert.doesNotMatch(html,/Please use fictional data/i);
  assert.match(html,/Do not enter sensitive personal information/i);
});

test("mobile Product Delivery changes from column split to stacked section transition",()=>{
  assert.match(css,/@media\(max-width:680px\)[\s\S]*\.case-section\{[^}]*linear-gradient\(180deg/);
  assert.match(css,/html\[data-theme=light\][^\n]*\.case-section\{[^}]*linear-gradient\(180deg/);
});
