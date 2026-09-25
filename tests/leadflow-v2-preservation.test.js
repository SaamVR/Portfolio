const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");

function read(p){return fs.readFileSync(path.join(root,p),"utf8")}

test("V2 preservation bundle exists with current production assets",()=>{
  for(const p of ["v2/index.html","v2/app.js","v2/dashboard.js","v2/styles.css","v2/favicon.svg","functions/v2/api/qualify.js"]){
    assert.ok(fs.existsSync(path.join(root,p)),p+" missing");
  }
});

test("V2 preserves current production markup and dashboard model",()=>{
  const current=read("index.html");
  const v2=read("v2/index.html");
  for(const marker of ["crm-analytics-v2","theme-toggle-track","tourProgressBar","presentationProgressBar","Lead Operations"]){
    assert.match(current,new RegExp(marker));
    assert.match(v2,new RegExp(marker));
  }
  assert.equal(read("dashboard.js"),read("v2/dashboard.js"));
  assert.equal(read("styles.css"),read("v2/styles.css"));
  assert.equal(read("favicon.svg"),read("v2/favicon.svg"));
});

test("V2 uses its own qualification route while preserving v2 engine",()=>{
  const app=read("v2/app.js");
  const api=read("functions/v2/api/qualify.js");
  assert.match(app,/fetch\(["']\/v2\/api\/qualify["']/);
  assert.match(app,/POST \/v2\/api\/qualify/);
  assert.match(api,/deterministic-qualification-v2/);
});

test("V1 remains untouched by V2 preservation",()=>{
  assert.match(read("functions/v1/api/qualify.js"),/deterministic-qualification-v1/);
  assert.match(read("v1/index.html"),/LeadFlow AI/);
});

