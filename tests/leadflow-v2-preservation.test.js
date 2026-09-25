const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const path=require("node:path");
const root=path.join(__dirname,"..");

function read(p){return fs.readFileSync(path.join(root,p),"utf8")}
function sha(p){return crypto.createHash("sha256").update(fs.readFileSync(path.join(root,p))).digest("hex")}

const FROZEN_V2={
  "v2/index.html":"2c48b71d17dfcb42f58c39d8799062bfed19d21bbe33adf2bb69d1ae9c009aaf",
  "v2/app.js":"f11eba77d751c89dfc7def585e234e5995f5d178a5f92a5f61706fe2b0f439b7",
  "v2/dashboard.js":"c831489e5338002a0f6ad3a956858ef838d35f19e4873b1e2faa1888c996a9c3",
  "v2/styles.css":"8d0c3b0356d6638c109fc93458be15d81023da79bfd7b12fa5c44508416f8a5a",
  "v2/favicon.svg":"8c5ff781afa9303693d288e3878957cdaaaef1255580c3fb595de4b5eb9a4d93",
  "functions/v2/api/qualify.js":"c3a0d1cfce32783188e5a0c431659f6f4e8a4e725081f4a60a1d242dec2658ec"
};

test("V2 preservation bundle exists with frozen production assets",()=>{
  for(const [p,expected] of Object.entries(FROZEN_V2)){
    assert.ok(fs.existsSync(path.join(root,p)),p+" missing");
    assert.equal(sha(p),expected,p+" changed after V2 freeze");
  }
});

test("V2 preserves the pre-V3 production surface while root advances to V3",()=>{
  const current=read("index.html");
  const v2=read("v2/index.html");
  for(const marker of ["crm-analytics-v2","theme-toggle-track","tourProgressBar","presentationProgressBar","Lead Operations"]){
    assert.match(v2,new RegExp(marker),marker);
  }
  assert.match(current,/storytelling\.js/);
  assert.match(current,/workflowStoryPacket/);
  assert.doesNotMatch(v2,/storytelling\.js/);
  assert.doesNotMatch(v2,/workflowStoryPacket/);
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
