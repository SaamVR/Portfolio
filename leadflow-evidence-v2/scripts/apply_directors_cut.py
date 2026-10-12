from pathlib import Path
root=Path(__file__).resolve().parent.parent
index=root/'index.html'
app=root/'app.js'
package=root/'package.json'
build=root/'scripts/build.mjs'

def one(content, old, new, label):
    count=content.count(old)
    if count!=1: raise RuntimeError(f'{label}: expected one match, found {count}: {old[:135]}')
    return content.replace(old,new,1)

html=index.read_text()
html=one(html,'  <link rel="stylesheet" href="./motion.css">','  <link rel="stylesheet" href="./motion.css">\n  <link rel="stylesheet" href="./storyboard.css">','film CSS')
html=one(html,'<section id="lab" class="section wrap lab-section"', (root/'docs/film-section.html').read_text()+'\n<section id="lab" class="section wrap lab-section"','film HTML')
html=one(html,'<a href="#lab" class="btn btn-dark">Run a real API workflow <span aria-hidden="true">↗</span></a>', '<button id="film-launch" class="btn btn-dark" type="button">Watch the lead journey <span aria-hidden="true">▶</span></button>','hero film CTA')
html=one(html,'<a href="#evidence" class="btn btn-outline">View the evidence <span aria-hidden="true">↓</span></a>', '<a href="#lab" class="btn btn-outline">Run the actual API <span aria-hidden="true">↓</span></a>','hero real API link')
html=one(html,'<div class="monitor-tools"><button type="button" id="replay-visual-button"', '<div class="monitor-tools"><button type="button" id="film-from-receipt" class="text-button" disabled>Watch cinematic story ▶</button><button type="button" id="replay-visual-button"','film from receipt')
index.write_text(html)

s=app.read_text()
s=one(s,'import { motion } from "./motion.js";','import { motion } from "./motion.js";\nimport { film } from "./storyboard.js";','film import')
s=one(s,'async function execute(replay = false) {','async function execute(replay = false, options = {}) {','execute options')
s=one(s,'  setBusy(true); labelStatus("running"); motion.onStart();','  setBusy(true); labelStatus("running"); motion.onStart();\n  if (options.film) film.waiting();\n  $("film-launch").disabled = true;\n  $("film-run").disabled = true;','film waiting')
s=one(s,'    motion.onSuccess(data);','''    motion.onSuccess(data);
    $("film-from-receipt").disabled = false;
    if (options.film) {
      try { film.load(data, { autoplay: true, scroll: true }); }
      catch (error) { film.fail(); console.warn('Cinematic verification failed:', error.message); }
    }''','film success')
s=one(s,'    motion.onError();','''    motion.onError();
    if (options.film) film.fail();
    $("film-from-receipt").disabled = true;''','film error')
s=one(s,'  } finally { clearTimeout(timeout); setBusy(false); }','''  } finally {
    clearTimeout(timeout);
    setBusy(false);
    $("film-launch").disabled = false;
    $("film-run").disabled = false;
  }''','film finally')
s=one(s,'    $("download-button").disabled = true;\n    $("crm-payload")', '    $("download-button").disabled = true;\n    $("film-from-receipt").disabled = true;\n    $("crm-payload")','scenario reset disables story')
s=one(s,'$("run-button").addEventListener("click",()=>execute(false));','''$("run-button").addEventListener("click",()=>execute(false));
function startFilmFromAPI() {
  if (active) return;
  film.section.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  execute(false, { film: true });
}
$("film-launch").addEventListener("click", startFilmFromAPI);
$("film-run").addEventListener("click", startFilmFromAPI);
$("film-from-receipt").addEventListener("click", () => { if (last) film.load(last, { autoplay: true, scroll: true }); });''','film controls')
s=one(s,'renderSelection();renderLocal();motion.init();checkAPI();','renderSelection();renderLocal();motion.init();film.init();checkAPI();','init film')
app.write_text(s)

p=build.read_text()
p=one(p,'await cp(join(root,"motion.js"),join(dist,"motion.js"));','''await cp(join(root,"motion.js"),join(dist,"motion.js"));
await cp(join(root,"storyboard.js"),join(dist,"storyboard.js"));
await cp(join(root,"storyboard-core.mjs"),join(dist,"storyboard-core.mjs"));
await cp(join(root,"storyboard.css"),join(dist,"storyboard.css"));''','build')
build.write_text(p)

p=package.read_text()
p=one(p,'node --check motion.js &&','node --check motion.js && node --check storyboard.js && node --check storyboard-core.mjs &&','syntax')
package.write_text(p)

readme=root/'README.md'
readme.write_text(readme.read_text()+'''\n## Director's Cut — authored motion narrative\n\nThe page now features a **24.4-second five-act cinematic playback** of an actual verified server receipt, launched by the visitor. It is separate from API execution time and expressly labeled that way. The entire story is reproducibly sampled from `storyboard-core.mjs`, and choreography lives in `storyboard.js`/`storyboard.css`.\n\nNarrative: arrival → request verification → explainable decision → sandbox handoff (optional real-trace-confirmed simulated retries) → human review and follow-up draft.\n\nVisitors can pause, seek, replay, skip, change speed, or jump between the five chapters. Browser tab changes pause the film. Reduced-motion visitors see the final confirmed result directly and have a full text transcript. Storyboard core has unit tests for accurate timing, fact gating, fault branching, and endpoint-verification requirements.\n\nSee `docs/directors-treatment.md` for choreography and animation principles.\n\n**Truth constraint:** the movie only starts after receiving a server receipt; timed beats are authored *post-result* narration, not a real-time progress representation. CRM remains a sandbox and follow-ups remain unsent drafts.\n''')
print('FILM PATCH SUCCESS: UI, API/film integration, build, package, documentation')
