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
