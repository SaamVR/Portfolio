const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("V3 is preserved as a versioned experience with its own API contract",()=>{
  for(const file of ["v3/index.html","v3/app.js","v3/dashboard.js","v3/storytelling.js","v3/styles.css","functions/v3/api/qualify.js"]){
    assert.ok(fs.existsSync(path.join(root,file)),file);
  }
  assert.match(read("v3/app.js"),/fetch\("\/v3\/api\/qualify"/);
  assert.match(read("functions/v3/api/qualify.js"),/deterministic-qualification-v2/);
});

test("V4 declares the warm industrial palette while keeping green primary",()=>{
  const css=read("styles.css");
  assert.match(css,/LEADFLOW V4 — WARM INDUSTRIAL PALETTE/);
  assert.match(css,/--v4-green:/);
  assert.match(css,/--v4-yellow:/);
  assert.match(css,/--v4-grey:/);
  assert.match(css,/--v4-brick:/);
  assert.match(css,/--accent:var\(--v4-green\)/);
});

test("V4 distributes yellow grey and brick across product surfaces",()=>{
  const css=read("styles.css");
  for(const selector of [".hero",".trust-band",".workflow-map article","#demo",".ops-dashboard","#reliability","#architecture","#roi",".final-cta"]){
    assert.ok(css.includes(selector),selector);
  }
  assert.match(css,/var\(--v4-yellow\)/);
  assert.match(css,/var\(--v4-grey\)/);
  assert.match(css,/var\(--v4-brick\)/);
});

test("V4 keeps semantic status colors distinct",()=>{
  const css=read("styles.css");
  assert.match(css,/\.temperature\.hot[\s\S]*var\(--v4-green\)/);
  assert.match(css,/\.temperature\.review[\s\S]*var\(--v4-yellow\)/);
  assert.match(css,/\.form-error[\s\S]*var\(--v4-brick\)/);
});
