from pathlib import Path
import html as htmlmod
import json, re, shutil, subprocess, tempfile, sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_harness import build_html

CHROME=shutil.which("google-chrome") or shutil.which("chromium")
assert CHROME

def run_case(script,width=1440,height=1000,budget=1800,reduced=True):
    html=build_html()
    html=html.replace("</body>",f"""<script>
window.__qaErrors=[];
window.onerror=(m)=>window.__qaErrors.push(String(m));
window.onunhandledrejection=(e)=>window.__qaErrors.push(String(e.reason||e));
{script}
</script></body>""",1)
    with tempfile.NamedTemporaryFile("w",suffix=".html",delete=False) as f:
        f.write(html); path=f.name
    cmd=[CHROME,"--headless","--no-sandbox","--disable-gpu","--run-all-compositor-stages-before-draw",f"--window-size={width},{height}",f"--virtual-time-budget={budget}"]
    if reduced: cmd.append("--force-prefers-reduced-motion=reduce")
    cmd += ["--dump-dom",f"file://{path}"]
    out=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=True)
    Path(path).unlink(missing_ok=True)
    m=re.search(r'<pre id="qaResult">(.*?)</pre>',out.stdout,re.S)
    assert m,out.stderr[-1500:]
    return json.loads(htmlmod.unescape(m.group(1)))

analytics_js=r"""
setTimeout(()=>{
  document.documentElement.dataset.theme='THEME';
  document.querySelector('#openCrmTop').click();
  document.querySelector('[data-crm-view="analytics"]').click();
  setTimeout(()=>{
    const root=document.querySelector('[data-crm-panel="analytics"]');
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
    const text=[...root.querySelectorAll('*')].filter(el=>visible(el)&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
    const min=Math.min(...text.map(el=>parseFloat(getComputedStyle(el).fontSize)));
    const nav=document.querySelector('.nav').getBoundingClientRect();
    const kpi=document.querySelector('.crm-analytics-v2 .analytics-summary article');
    const result={
      minText:min,
      title:document.querySelector('#crmViewTitle').textContent.trim(),
      regions:['analyticsDistribution','analyticsScoreTrend','analyticsSourceQuality','analyticsUrgencyMix'].map(id=>({id,has:document.querySelector('#'+id).innerText.trim().length>0||!!document.querySelector('#'+id+' svg')})),
      kpiBg:getComputedStyle(kpi).backgroundColor,
      nav:{left:Math.round(nav.left),right:Math.round(nav.right),width:Math.round(nav.width)},
      viewport:innerWidth,docWidth:document.documentElement.scrollWidth,
      theme:document.documentElement.dataset.theme,
      errors:window.__qaErrors
    };
    const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(result);document.body.appendChild(pre);
  },180);
},80);
"""

for theme in ("dark","light"):
    for width,height in ((390,844),(1440,1000)):
        out=run_case(analytics_js.replace("THEME",theme),width,height)
        assert out["title"]=="Pipeline Analytics",out
        assert out["minText"]>=12,out
        assert all(r["has"] for r in out["regions"]),out
        assert out["nav"]["left"]==0 and abs(out["nav"]["right"]-out["viewport"])<=1,out
        assert out["docWidth"]<=out["viewport"],out
        if theme=="light":
            assert out["kpiBg"]=="rgb(255, 255, 255)",out
        assert not out["errors"],out
        print("ANALYTICS",theme,width,out)

theme_js=r"""
setTimeout(()=>{
  const before={theme:document.documentElement.dataset.theme,label:document.querySelector('#themeToggleLabel').textContent,pressed:document.querySelector('#themeToggle').getAttribute('aria-pressed')};
  document.querySelector('#themeToggle').click();
  setTimeout(()=>{
    const thumb=getComputedStyle(document.querySelector('.theme-toggle-thumb'));
    const after={theme:document.documentElement.dataset.theme,label:document.querySelector('#themeToggleLabel').textContent,pressed:document.querySelector('#themeToggle').getAttribute('aria-pressed'),transform:thumb.transform};
    const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify({before,after,errors:window.__qaErrors});document.body.appendChild(pre);
  },80);
},80);
"""
out=run_case(theme_js,390,844)
assert out["before"]=={"theme":"dark","label":"Dark","pressed":"false"},out
assert out["after"]["theme"]=="light" and out["after"]["label"]=="Light" and out["after"]["pressed"]=="true" and out["after"]["transform"]!="none",out
assert not out["errors"],out
print("THEME",out)

tour_js=r"""
setTimeout(()=>{
  window.__tourSeen=[];
  const idx=document.querySelector('#tourIndex');
  const capture=()=>window.__tourSeen.push({idx:idx.textContent.trim(),exec:document.querySelector('#execStatus').textContent.trim(),label:document.querySelector('#tourLabel').textContent.trim()});
  new MutationObserver(capture).observe(idx,{childList:true,subtree:true,characterData:true});
  document.querySelector('#guidedDemo').click();
  capture();
  setTimeout(()=>{
    const result={
      seen:window.__tourSeen,
      exec:document.querySelector('#execStatus').textContent.trim(),
      score:document.querySelector('#scoreValue').textContent.trim(),
      open:document.querySelector('#tourStatus').classList.contains('open'),
      disabled:document.querySelector('#guidedDemo').disabled,
      errors:window.__qaErrors
    };
    const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(result);document.body.appendChild(pre);
  },5200);
},80);
"""
out=run_case(tour_js,1440,950,budget=6500,reduced=True)
seen={}
for item in out["seen"]: seen.setdefault(item["idx"],item)
assert all(f"{i} / 6" in seen for i in range(1,7)),out
assert seen["3 / 6"]["exec"]=="COMPLETE",out
assert out["exec"]=="COMPLETE" and out["score"]=="92",out
assert out["open"] is False and out["disabled"] is False,out
assert not out["errors"],out
print("TOUR",out)
print("CRM_NAV_WALKTHROUGH_RUNTIME_AUDIT=PASS")

