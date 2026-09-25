const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const workflow=fs.readFileSync(path.join(__dirname,"..",".github","workflows","leadflow-deploy-cloudflare.yml"),"utf8");

test("deployment payload includes the complete V4 runtime and all preserved versions",()=>{
  assert.match(workflow,/cp index\.html app\.js dashboard\.js storytelling\.js styles\.css favicon\.svg/);
  for(const version of ["v1","v2","v3"]){
    assert.match(workflow,new RegExp("cp -R "+version+" \/tmp\/leadflow-deploy\/"+version));
  }
});

test("source verification protects V4 runtime modules and versioned APIs",()=>{
  assert.match(workflow,/node --check dashboard\.js/);
  assert.match(workflow,/node --check storytelling\.js/);
  assert.match(workflow,/LEADFLOW V4 — WARM INDUSTRIAL PALETTE/);
  assert.match(workflow,/functions\/v3\/api\/qualify\.js/);
  assert.match(workflow,/functions\/v2\/api\/qualify\.js/);
  assert.match(workflow,/functions\/v1\/api\/qualify\.js/);
});

test("post-deploy smoke test covers root assets plus V1 V2 and V3",()=>{
  for(const route of ["/dashboard.js","/storytelling.js","/v1/","/v2/","/v3/","/api/qualify","/v1/api/qualify","/v2/api/qualify","/v3/api/qualify"]){
    assert.ok(workflow.includes(route),route);
  }
  assert.match(workflow,/deterministic-qualification-v1/);
  assert.match(workflow,/deterministic-qualification-v2/);
});
