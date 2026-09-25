const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const variants=[
  {
    slug:"refine-brown",
    marker:"LEADFLOW REFINE — BROWN",
    bodyClass:"leadflow-refine-brown",
    darkAccent:"#B98667",
    lightAccent:"#7A4F36"
  },
  {
    slug:"refine-navy",
    marker:"LEADFLOW REFINE — NAVY",
    bodyClass:"leadflow-refine-navy",
    darkAccent:"#76A9DA",
    lightAccent:"#285F93"
  }
];

for(const variant of variants){
  test(variant.slug+" exists as a shared-runtime color variant",()=>{
    const html=read(variant.slug+"/index.html");
    const css=read(variant.slug+"/theme.css");
    assert.match(html,new RegExp('class="leadflow-v4 '+variant.bodyClass+'"'));
    assert.match(html,/href="\/styles\.css"/);
    assert.match(html,/href="\.\/theme\.css"/);
    assert.match(html,/src="\/dashboard\.js"/);
    assert.match(html,/src="\/storytelling\.js"/);
    assert.match(html,/src="\/app\.js"/);
    assert.match(css,new RegExp(variant.marker));
    assert.ok(css.includes("--v4-green:"+variant.darkAccent),variant.slug+" dark dominant accent");
    assert.ok(css.includes("--v4-green:"+variant.lightAccent),variant.slug+" light dominant accent");
    assert.doesNotMatch(css,/#78D39C|#1F6B4B/i);
  });
}

test("variant routes are included in the Cloudflare deployment contract",()=>{
  const workflow=read(".github/workflows/leadflow-deploy-cloudflare.yml");
  assert.match(workflow,/cp -R refine-brown \/tmp\/leadflow-deploy\/refine-brown/);
  assert.match(workflow,/cp -R refine-navy \/tmp\/leadflow-deploy\/refine-navy/);
  assert.match(workflow,/brown=\$\(curl -fsSL "\$url\/refine-brown\/"\)/);
  assert.match(workflow,/navy=\$\(curl -fsSL "\$url\/refine-navy\/"\)/);
  assert.match(workflow,/LEADFLOW REFINE — BROWN/);
  assert.match(workflow,/LEADFLOW REFINE — NAVY/);
});


for(const variant of variants){
  test(variant.slug+" neutralizes inherited green story and success states",()=>{
    const css=read(variant.slug+"/theme.css");
    const required=[
      ".workflow-story-packet.verified",
      ".workflow-story-packet.ready",
      ".workflow-story-connector.tone-verified",
      ".workflow-story-connector.tone-ready",
      ".reliability-actions [data-edge=\"duplicate\"].active",
      ".architecture-payload.arch-tone-valid",
      ".architecture-payload.arch-tone-ready",
      ".architecture.arch-phase-valid [data-arch-node=\"api\"]",
      ".architecture.arch-phase-ready [data-arch-node=\"next\"]",
      ".incident-rail::before",
      ".incident-rail article.incident-complete::before",
      ".tour-progress i",
      ".execution-progress>div",
      ".ops-chart-item.hot i",
      "html[data-theme=light] .workflow-map article:nth-of-type(3) .icon",
      "html[data-theme=light] .hero .panel-top i"
    ];
    for(const selector of required)assert.ok(css.includes(selector),variant.slug+" missing "+selector);
  });
}


for(const variant of variants){
  test(variant.slug+" recolors the full environmental chrome, not only accent tokens",()=>{
    const css=read(variant.slug+"/theme.css");
    const required=[
      "--surface-raised:",
      "--surface-focus:",
      "--border-quiet:",
      "--text-secondary:",
      "--status-nurture:",
      ".theme-toggle-track",
      ".theme-toggle-thumb",
      ".mini-terminal",
      ".float-card",
      ".trust-band",
      "#roi .calculator",
      ".calc-result",
      ".number-field",
      ".blueprint-disclosure",
      ".blueprint-summary-flow span",
      ".blueprint-output",
      ".case-section",
      ".portfolio-next-card",
      ".final-cta .tag",
      ".crm-shell"
    ];
    for(const selector of required)assert.ok(css.includes(selector),variant.slug+" missing environment override "+selector);
  });
}


test("refine variants use a shared neutral canvas instead of tinted page backgrounds",()=>{
  for(const slug of ["refine-brown","refine-navy"]){
    const css=read(slug+"/theme.css");
    assert.match(css,/LEADFLOW REFINE — NEUTRAL CANVAS/);
    assert.match(css,/--bg:#111315;/);
    assert.match(css,/--bg2:#181A1C;/);
    assert.match(css,/--card:#1D2022;/);
    assert.match(css,/--surface-1:#1D2022;/);
    assert.match(css,/html\[data-theme=light\][\s\S]*--bg:#F6F7F7;/);
    assert.match(css,/html\[data-theme=light\][\s\S]*--bg2:#EEF0F0;/);
    assert.match(css,/html\[data-theme=light\][\s\S]*--card:#FFFFFF;/);
    assert.match(css,/html\[data-theme=light\][\s\S]*--surface-1:#FFFFFF;/);
    assert.doesNotMatch(css,/radial-gradient\(circle at 8[89]% 3%,rgba\((?:185,134,103|118,169,218)/);
  }
});

test("refine variants are light-first on a fresh visit",()=>{
  for(const slug of ["refine-brown","refine-navy"]){
    const html=read(slug+"/index.html");
    assert.match(html,/localStorage\.getItem\('leadflow-theme'\).*\|\|'light'/s);
  }
});

test("neutral-canvas refinement keeps brown and navy identity in accents, not surfaces",()=>{
  const brown=read("refine-brown/theme.css");
  const navy=read("refine-navy/theme.css");
  assert.match(brown,/--accent:#B98667;/);
  assert.match(brown,/html\[data-theme=light\][\s\S]*--accent:#7A4F36;/);
  assert.match(navy,/--accent:#76A9DA;/);
  assert.match(navy,/html\[data-theme=light\][\s\S]*--accent:#285F93;/);
  for(const css of [brown,navy]){
    assert.match(css,/\.band\{background:#181A1C!important\}/);
    assert.match(css,/html\[data-theme=light\] \.band\{background:#EEF0F0!important\}/);
    assert.match(css,/html\[data-theme=light\] \.case-section\{[\s\S]*#F8F9F9/);
    assert.match(css,/html\[data-theme=light\] \.crm-shell[\s\S]*background:#F8F9F9!important/);
  }
});
