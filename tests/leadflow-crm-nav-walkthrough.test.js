const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");

test("Pipeline Analytics exposes a full operational analytics surface",()=>{
  for(const id of [
    "analyticsAvg","analyticsIntent","analyticsReview","analyticsUrgent",
    "analyticsDistribution","analyticsScoreTrend","analyticsSourceQuality",
    "analyticsUrgencyMix","analyticsInsight"
  ]) assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);
});

test("Pipeline Analytics defines readable type and explicit light KPI surfaces",()=>{
  assert.match(css,/\.crm-analytics-v2[\s\S]*\.analytics-summary article>span\s*\{[^}]*font-size:\s*13px/);
  assert.match(css,/\.crm-analytics-v2[\s\S]*\.analytics-summary article>small\s*\{[^}]*font-size:\s*13px/);
  assert.match(css,/html\[data-theme=light\] \.crm-analytics-v2 \.analytics-summary article\s*\{[^}]*background:\s*#(?:F|f)/);
});

test("site navbar is edge-to-edge with an inner layout rail",()=>{
  assert.match(html,/<header class=["']nav["']>/);
  assert.match(html,/class=["']nav-inner["']/);
  assert.match(css,/\.nav\s*\{[^}]*width:\s*100%[^}]*max-width:\s*none/);
});

test("theme toggle is a labeled animated switch",()=>{
  assert.match(html,/class=["']theme-toggle-track["']/);
  assert.match(html,/id=["']themeToggleLabel["']/);
  assert.match(css,/\.theme-toggle-thumb/);
  assert.match(css,/html\[data-theme=light\] \.theme-toggle-thumb/);
  assert.match(app,/themeToggleLabel/);
  assert.match(app,/next==="light"\?"Light":"Dark"/);
});

test("guided walkthrough waits for the actual workflow and section holds",()=>{
  assert.match(app,/async function waitForWorkflowCompletion/);
  assert.match(app,/async function runGuidedWalkthrough/);
  assert.match(app,/await waitForWorkflowCompletion/);
  assert.match(app,/tourHoldMs/);
  assert.doesNotMatch(app,/await delay\(1300\)/);
});

test("guided walkthrough has a visible progress track",()=>{
  assert.match(html,/id=["']tourProgressBar["']/);
  assert.match(css,/\.tour-progress/);
  assert.match(app,/tourProgressBar/);
});
