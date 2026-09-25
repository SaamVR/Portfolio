const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("navy refinement follows focused motion and removes decorative loops",()=>{
  const css=read("refine-navy/theme.css");
  assert.match(css,/LEADFLOW NAVY — GUIDELINE REFINEMENT/);
  assert.match(css,/--navy-motion-fast:160ms;/);
  assert.match(css,/--navy-motion-standard:240ms;/);
  assert.match(css,/--navy-motion-emphasis:320ms;/);
  assert.match(css,/--navy-motion-ease:cubic-bezier\(\.4,0,\.2,1\);/);
  assert.match(css,/\.signal,\.connector i,\.flow-node,\.fc-two,#runAutomation\{animation:none!important\}/);
  assert.match(css,/\.workflow-map article:hover\{transform:none!important/);
});

test("navy sticky header is compact opaque and visually separated",()=>{
  const css=read("refine-navy/theme.css");
  const block=css.slice(css.lastIndexOf("/* LEADFLOW NAVY — GUIDELINE REFINEMENT"));
  assert.match(block,/\.nav\{[\s\S]*height:64px!important/);
  assert.match(block,/\.nav\{[\s\S]*backdrop-filter:none!important/);
  assert.match(block,/html\[data-theme=light\] \.nav\{[\s\S]*background:#FAFAFA!important/);
  assert.match(block,/html:not\(\[data-theme=light\]\) \.nav\{[\s\S]*background:#141414!important/);
  assert.match(block,/@media\(max-width:680px\)\{[\s\S]*\.nav\{height:60px!important/);
});

test("navy hierarchy uses restrained accent and low-noise surfaces",()=>{
  const css=read("refine-navy/theme.css");
  const block=css.slice(css.lastIndexOf("/* LEADFLOW NAVY — GUIDELINE REFINEMENT"));
  assert.match(block,/--navy-primary:#245B8F;/);
  assert.match(block,/--navy-primary-strong:#174A75;/);
  assert.match(block,/\.primary-btn\{[\s\S]*background:var\(--navy-primary-strong\)!important/);
  assert.match(block,/\.glass-panel\{[\s\S]*box-shadow:0 16px 44px rgba\(0,0,0,\.08\)!important/);
  assert.match(block,/html\[data-theme=light\] \.final-cta\{[\s\S]*background:#FFFFFF!important/);
  assert.match(block,/html\[data-theme=light\] \.final-cta::before\{[\s\S]*background:var\(--navy-primary\)!important/);
});

test("navy optional detail affordances are explicit accessible and not over-animated",()=>{
  const html=read("refine-navy/index.html");
  const css=read("refine-navy/theme.css");
  assert.match(html,/<details class="architecture-more">/);
  assert.match(html,/<details class="engineering-proof">/);
  assert.match(html,/<details class="blueprint-disclosure">/);
  assert.doesNotMatch(html,/<details[^>]*\sopen(?:\s|>)/);
  const block=css.slice(css.lastIndexOf("/* LEADFLOW NAVY — GUIDELINE REFINEMENT"));
  assert.match(block,/\.architecture-more>summary,\s*\.engineering-proof>summary,\s*\.blueprint-disclosure>summary\{[\s\S]*min-height:56px!important/);
  assert.match(block,/\.architecture-more>summary:focus-visible,\s*\.engineering-proof>summary:focus-visible,\s*\.blueprint-disclosure>summary:focus-visible/);
});

test("navy maintains strong text contrast targets in the primary hierarchy",()=>{
  const css=read("refine-navy/theme.css");
  const block=css.slice(css.lastIndexOf("/* LEADFLOW NAVY — GUIDELINE REFINEMENT"));
  assert.match(block,/html\[data-theme=light\]\{[\s\S]*--text:#242424;/);
  assert.match(block,/html\[data-theme=light\]\{[\s\S]*--text-soft:#444444;/);
  assert.match(block,/html\[data-theme=light\]\{[\s\S]*--muted:#666666;/);
  assert.match(block,/\.desktop-nav a\.is-active\{[\s\S]*color:var\(--navy-primary-strong\)!important/);
});
