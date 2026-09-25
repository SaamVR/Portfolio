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


test("refine variants use a strict achromatic canvas",()=>{
  const expectedDark={
    "--bg":"#111111","--bg2":"#181818","--card":"#202020","--card2":"#262626",
    "--surface-1":"#202020","--surface-2":"#161616","--surface-3":"#282828",
    "--text":"#F2F2F2","--text-soft":"#D8D8D8","--muted":"#A8A8A8",
    "--meta-readable":"#B0B0B0","--line":"#383838","--line2":"#505050"
  };
  const expectedLight={
    "--bg":"#F7F7F7","--bg2":"#EFEFEF","--card":"#FFFFFF","--card2":"#F3F3F3",
    "--surface-1":"#FFFFFF","--surface-2":"#F3F3F3","--surface-3":"#EAEAEA",
    "--text":"#242424","--text-soft":"#444444","--muted":"#666666",
    "--meta-readable":"#686868","--line":"#D2D2D2","--line2":"#B8B8B8"
  };
  const achromatic=hex=>{
    const m=hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    return !!m && m[1].toLowerCase()===m[2].toLowerCase() && m[2].toLowerCase()===m[3].toLowerCase();
  };
  for(const slug of ["refine-brown","refine-navy"]){
    const css=read(slug+"/theme.css");
    assert.match(css,/LEADFLOW REFINE — ACHROMATIC CANVAS/);
    const block=css.slice(css.lastIndexOf("/* LEADFLOW REFINE — ACHROMATIC CANVAS"));
    for(const [token,value] of Object.entries(expectedDark)){
      assert.ok(block.includes(token+":"+value),slug+" missing dark "+token+" "+value);
      assert.ok(achromatic(value),value+" must be grayscale");
    }
    const light=block.slice(block.indexOf("html[data-theme=light]{"));
    for(const [token,value] of Object.entries(expectedLight)){
      assert.ok(light.includes(token+":"+value),slug+" missing light "+token+" "+value);
      assert.ok(achromatic(value),value+" must be grayscale");
    }
    assert.match(block,/body\{background:#111111!important\}/);
    assert.match(block,/html\[data-theme=light\] body\{background:#F7F7F7!important\}/);
    assert.doesNotMatch(block,/#F6F7F7|#EEF0F0|#CDD2D4|#C0CCD8|#E8EEF4|#F3F6F9/i);
  }
});

test("refine variants are light-first on a fresh visit",()=>{
  for(const slug of ["refine-brown","refine-navy"]){
    const html=read(slug+"/index.html");
    assert.match(html,/localStorage\.getItem\('leadflow-theme'\).*\|\|'light'/s);
  }
});

test("achromatic refinement keeps brown and navy identity in accents, not neutral surfaces",()=>{
  const brown=read("refine-brown/theme.css");
  const navy=read("refine-navy/theme.css");
  assert.match(brown,/--accent:#B98667;/);
  assert.match(brown,/html\[data-theme=light\][\s\S]*--accent:#7A4F36;/);
  assert.match(navy,/--accent:#76A9DA;/);
  assert.match(navy,/html\[data-theme=light\][\s\S]*--accent:#285F93;/);
  for(const css of [brown,navy]){
    const block=css.slice(css.lastIndexOf("/* LEADFLOW REFINE — ACHROMATIC CANVAS"));
    assert.match(block,/\.band\{background:#181818!important\}/);
    assert.match(block,/html\[data-theme=light\] \.band\{background:#EFEFEF!important\}/);
    assert.match(block,/html\[data-theme=light\] \.case-section\{[\s\S]*#F7F7F7/);
    assert.match(block,/html\[data-theme=light\] \.crm-shell[\s\S]*background:#F7F7F7!important/);
  }
});
