from pathlib import Path
import html as htmlmod
import json, re, shutil, subprocess, tempfile
from browser_harness import build_html

CHROME = shutil.which("google-chrome") or shutil.which("chromium")
assert CHROME, "Chrome/Chromium is required"

def run_case(js, *, width=1440, height=1000, empty=False, reduce=False):
    source = build_html(empty=empty)
    source = source.replace("</body>", f"""<script>
window.__qaErrors=[];
window.onerror=(m)=>window.__qaErrors.push(String(m));
window.onunhandledrejection=(e)=>window.__qaErrors.push(String(e.reason||e));
{js}
</script></body>""", 1)
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(source)
        path=f.name
    args=[CHROME,"--headless","--no-sandbox","--disable-gpu","--run-all-compositor-stages-before-draw",
          "--virtual-time-budget=1800",f"--window-size={width},{height}"]
    if reduce:
        args.append("--force-prefers-reduced-motion=reduce")
    args += ["--dump-dom",f"file://{path}"]
    result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=True)
    Path(path).unlink(missing_ok=True)
    match=re.search(r'<pre id="qaResult">(.*?)</pre>',result.stdout,re.S)
    assert match, result.stderr[-1500:]
    return json.loads(htmlmod.unescape(match.group(1)))

base_js=r"""
setTimeout(()=>{
  document.documentElement.dataset.theme='dark';
  document.querySelector('#openCrmTop').click();
  setTimeout(()=>{
    const small=()=>[...document.querySelectorAll('#crmModal *')].filter(el=>{
      const t=el.textContent.trim(),s=getComputedStyle(el);
      return t&&!el.children.length&&el.getClientRects().length&&parseFloat(s.fontSize)<12&&s.visibility!=='hidden'&&s.display!=='none';
    }).length;
    const base={
      hidden:document.querySelector('#crmModal').getAttribute('aria-hidden'),
      scroll:Math.round(document.querySelector('.crm-main').scrollTop||0),
      total:document.querySelector('#crmTotal').textContent.trim(),
      hot:document.querySelector('#crmHot').textContent.trim(),
      avg:document.querySelector('#crmAverage').textContent.trim(),
      immediate:document.querySelector('#crmImmediate').textContent.trim(),
      donut:!!document.querySelector('#crmOverviewDistribution svg'),
      trend:!!document.querySelector('#crmOverviewScoreTrend svg'),
      queue:document.querySelector('#crmOverviewActionQueue').innerText.trim(),
      sources:document.querySelector('#crmOverviewSourceQuality').innerText.trim(),
      urgency:document.querySelector('#crmOverviewUrgencyMix').innerText.trim(),
      activity:document.querySelector('#crmOverviewActivity').innerText.trim(),
      rows:document.querySelectorAll('#crmRows tr').length,
      title:document.querySelector('#crmViewTitle').textContent.trim(),
      small:small()
    };
    const search=document.querySelector('#crmSearch');
    search.value='Mina';search.dispatchEvent(new Event('input',{bubbles:true}));
    base.searchRows=document.querySelectorAll('#crmRows tr').length;
    search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));
    const filter=document.querySelector('#crmFilter');
    filter.value='hot';filter.dispatchEvent(new Event('change',{bubbles:true}));
    base.filterRows=document.querySelectorAll('#crmRows tr').length;
    filter.value='all';filter.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#crmRows tr').click();
    base.drawer=document.querySelector('#leadDrawer').classList.contains('open');
    document.querySelector('#closeDrawer').click();
    base.views={};
    for(const view of ['analytics','automations','settings','leads']){
      document.querySelector('[data-crm-view="'+view+'"]').click();
      base.views[view]={
        active:document.querySelector('[data-crm-panel="'+view+'"]').classList.contains('active'),
        title:document.querySelector('#crmViewTitle').textContent.trim()
      };
    }
    base.errors=window.__qaErrors.slice();
    const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(base);document.body.appendChild(pre);
  },180);
},60);
"""

for theme in ("dark","light"):
    js=base_js.replace("document.documentElement.dataset.theme='dark'",f"document.documentElement.dataset.theme='{theme}'")
    out=run_case(js,reduce=True)
    assert out["hidden"]=="false" and out["scroll"]==0,out
    assert out["total"]=="3" and out["hot"]=="1" and out["avg"]=="64" and out["immediate"]=="0",out
    assert out["donut"] and out["trend"] and out["queue"] and out["sources"] and out["urgency"] and out["activity"],out
    assert all(x in out["sources"] for x in ["Website Form","Meta Lead Ads","Referral"]),out
    assert out["rows"]==3 and out["searchRows"]==1 and out["filterRows"]==1,out
    assert out["drawer"] and out["small"]==0 and not out["errors"],out
    expected={"analytics":"Pipeline Analytics","automations":"Automation Control","settings":"Workspace Settings","leads":"Lead Operations"}
    assert all(out["views"][k]["active"] and out["views"][k]["title"]==v for k,v in expected.items()),out
    print(theme,out)

mobile_js=r"""
setTimeout(()=>{
  document.querySelector('#openCrmTop').click();
  setTimeout(()=>{
    const shell=document.querySelector('.crm-shell').getBoundingClientRect(),wrap=document.querySelector('.crm-table-wrap');
    const out={
      viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      shellLeft:Math.round(shell.left),shellRight:Math.round(shell.right),
      tableClient:wrap.clientWidth,tableScroll:wrap.scrollWidth,
      kpiCols:getComputedStyle(document.querySelector('.crm-overview-kpis')).gridTemplateColumns,
      small:[...document.querySelectorAll('#crmModal *')].filter(el=>{
        const t=el.textContent.trim(),s=getComputedStyle(el);
        return t&&!el.children.length&&el.getClientRects().length&&parseFloat(s.fontSize)<12&&s.visibility!=='hidden'&&s.display!=='none'
      }).length,
      errors:window.__qaErrors.slice()
    };
    const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(out);document.body.appendChild(pre);
  },180);
},60);
"""
mobile=run_case(mobile_js,width=390,height=844,reduce=True)
assert mobile["scrollWidth"]<=mobile["viewport"],mobile
assert mobile["shellLeft"]>=0 and mobile["shellRight"]<=mobile["viewport"],mobile
assert mobile["tableScroll"]>mobile["tableClient"],mobile
assert mobile["small"]==0 and not mobile["errors"],mobile
print("mobile",mobile)

empty_js=r"""
setTimeout(()=>{
  document.querySelector('#openCrmTop').click();
  setTimeout(()=>{
    const out={
      total:document.querySelector('#crmTotal').textContent.trim(),
      avg:document.querySelector('#crmAverage').textContent.trim(),
      rows:document.querySelectorAll('#crmRows tr').length,
      donut:!!document.querySelector('#crmOverviewDistribution svg'),
      trend:document.querySelector('#crmOverviewScoreTrend').innerText.trim(),
      queue:document.querySelector('#crmOverviewActionQueue').innerText.trim(),
      source:document.querySelector('#crmOverviewSourceQuality').innerText.trim(),
      urgency:document.querySelector('#crmOverviewUrgencyMix').innerText.trim(),
      activity:document.querySelector('#crmOverviewActivity').innerText.trim(),
      animation:getComputedStyle(document.querySelector('.crm-overview-kpis')).animationName,
      errors:window.__qaErrors.slice()
    };
    const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(out);document.body.appendChild(pre);
  },180);
},60);
"""
empty=run_case(empty_js,empty=True,reduce=True)
assert empty["total"]=="0" and empty["avg"]=="0" and empty["rows"]==0,empty
assert empty["donut"] and "Run a lead" in empty["trend"] and "No queued actions" in empty["queue"],empty
assert "No source data" in empty["source"] and "No timeline data" in empty["urgency"] and "Run the interactive demo" in empty["activity"],empty
assert empty["animation"]=="none" and not empty["errors"],empty
print("empty",empty)
print("CRM_DETAIL_RUNTIME_AUDIT=PASS")

