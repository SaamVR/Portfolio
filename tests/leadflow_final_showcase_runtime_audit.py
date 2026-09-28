from pathlib import Path
import html as htmlmod
import json, re, shutil, subprocess, tempfile
from browser_harness import build_html

CHROME = shutil.which("google-chrome") or shutil.which("chromium")
assert CHROME, "Chrome/Chromium is required"

AUDIT_JS = r"""
const parse=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
const over=(fg,bg)=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
const ratio=(a,b)=>{const A=lum(a),B=lum(b);return (Math.max(A,B)+.05)/(Math.min(A,B)+.05)};
const effectiveBg=el=>{const chain=[];for(let n=el;n;n=n.parentElement)chain.push(n);chain.reverse();let bg={r:255,g:255,b:255,a:1};for(const n of chain){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0)bg=over(c,bg)}return bg};
const effectiveOpacity=el=>{let o=1;for(let n=el;n;n=n.parentElement){const v=parseFloat(getComputedStyle(n).opacity);o*=Number.isFinite(v)?v:1}return o};
const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),closed=el.closest("details:not([open])");return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"&&effectiveOpacity(el)>.01&&(!closed||!!el.closest("summary"))};
const textEls=[...document.querySelectorAll('body *')].filter(el=>visible(el)&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
const small=textEls.filter(el=>parseFloat(getComputedStyle(el).fontSize)<12).map(el=>el.textContent.trim().slice(0,50));
const low=[];
for(const el of textEls){
  const s=getComputedStyle(el),fg0=parse(s.color);if(!fg0)continue;
  const bg=effectiveBg(el),fg=over({...fg0,a:fg0.a*effectiveOpacity(el)},bg),cr=ratio(fg,bg);
  const fs=parseFloat(s.fontSize),fw=parseInt(s.fontWeight)||400,need=(fs>=24||(fs>=18.66&&fw>=700))?3:4.5;
  if(cr<need)low.push({text:el.textContent.trim().replace(/\s+/g,' ').slice(0,60),ratio:+cr.toFixed(2),size:fs,cls:String(el.className||'').slice(0,50)});
}
const controls=[...document.querySelectorAll('button,input:not([type=hidden]):not([type=range]):not([type=checkbox]),select,textarea,summary,a.primary-btn,a.secondary-btn,.footer a')].filter(visible);
const smallTargets=controls.map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,text:(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,50),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}}).filter(x=>x.h<44||(x.tag==='BUTTON'&&x.w<44));
const insideScrollContainer=el=>{for(let n=el.parentElement;n;n=n.parentElement){const s=getComputedStyle(n);if((s.overflowX==='auto'||s.overflowX==='scroll')&&n.scrollWidth>n.clientWidth+1)return true}return false};
const overflow=[...document.querySelectorAll('body *')].filter(el=>visible(el)&&!insideScrollContainer(el)).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,cls:String(el.className||'').slice(0,50),left:+r.left.toFixed(1),right:+r.right.toFixed(1)}}).filter(x=>x.left<-1||x.right>innerWidth+1);
"""

def run_case(width, height, theme, open_details=False):
    html=build_html()
    extra_open = "document.querySelector('.blueprint-disclosure').open=true;document.querySelector('.architecture-more').open=true;document.querySelector('.engineering-proof').open=true;" if open_details else ""
    js=f"""
setTimeout(()=>{{
  document.documentElement.dataset.theme={json.dumps(theme)};
  document.documentElement.style.scrollBehavior='auto';
  {extra_open}
  setTimeout(()=>{{
    document.querySelectorAll('.reveal-on-scroll').forEach(el=>el.classList.add('is-visible'));
    document.querySelectorAll('.section').forEach(el=>el.classList.add('is-section-visible'));
    {AUDIT_JS}
    const result={{
      viewport:innerWidth,
      height:document.documentElement.scrollHeight,
      width:document.documentElement.scrollWidth,
      small,low,smallTargets,overflow,
      pipelineDisplay:getComputedStyle(document.querySelector('#opsPipelineRows tr')).display,
      pipelineWrap:{{client:document.querySelector('.ops-table-wrap').clientWidth,scroll:document.querySelector('.ops-table-wrap').scrollWidth}},
      errors:window.__qaErrors.slice()
    }};
    const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(result);document.body.appendChild(pre);
  }},120);
}},80);
"""
    html=html.replace("</body>",f"""<script>
window.__qaErrors=[];
window.onerror=(m)=>window.__qaErrors.push(String(m));
window.onunhandledrejection=(e)=>window.__qaErrors.push(String(e.reason||e));
{js}
</script></body>""",1)
    with tempfile.NamedTemporaryFile("w",suffix=".html",delete=False) as f:
        f.write(html); path=f.name
    cmd=[CHROME,"--headless","--no-sandbox","--disable-gpu","--run-all-compositor-stages-before-draw","--force-prefers-reduced-motion=reduce",f"--window-size={width},{height}","--virtual-time-budget=1200","--dump-dom",f"file://{path}"]
    result=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=True)
    Path(path).unlink(missing_ok=True)
    m=re.search(r'<pre id="qaResult">(.*?)</pre>',result.stdout,re.S)
    assert m,result.stderr[-1200:]
    return json.loads(htmlmod.unescape(m.group(1)))

for theme in ("dark","light"):
    for width,height in ((390,844),(768,900),(1024,900),(1440,1000)):
        out=run_case(width,height,theme)
        assert out["small"]==[],(theme,width,"small",out["small"])
        assert out["low"]==[],(theme,width,"contrast",out["low"])
        assert out["smallTargets"]==[],(theme,width,"targets",out["smallTargets"])
        assert out["width"]<=out["viewport"]+1,(theme,width,"document overflow",out["width"],out["viewport"])
        assert out["overflow"]==[],(theme,width,"uncontained overflow",out["overflow"])
        assert not out["errors"],(theme,width,"errors",out["errors"])
        if width==390:
            assert out["pipelineDisplay"]=="grid",out
            assert out["pipelineWrap"]["scroll"]<=out["pipelineWrap"]["client"]+2,out
        print("BASE",theme,width,out["height"])

for theme in ("dark","light"):
    for width,height in ((390,844),(1440,1000)):
        out=run_case(width,height,theme,open_details=True)
        assert out["small"]==[],(theme,width,"open small",out["small"])
        assert out["low"]==[],(theme,width,"open contrast",out["low"])
        assert out["smallTargets"]==[],(theme,width,"open targets",out["smallTargets"])
        assert out["width"]<=out["viewport"]+1,(theme,width,"open document overflow",out["width"],out["viewport"])
        assert out["overflow"]==[],(theme,width,"open uncontained overflow",out["overflow"])
        assert not out["errors"],(theme,width,"open errors",out["errors"])
        print("OPEN",theme,width,out["height"])

# Deferred-detail interaction: content must reveal when a visitor opens it normally.
html=build_html().replace("</body>",r"""
<script>
window.__qaErrors=[];
window.onerror=(m)=>window.__qaErrors.push(String(m));
setTimeout(()=>{
 document.documentElement.style.scrollBehavior='auto';
 document.querySelector('#blueprint').scrollIntoView({block:'center',behavior:'auto'});
 document.querySelector('.blueprint-disclosure>summary').click();
 setTimeout(()=>{
   const bp={cls:document.querySelector('.blueprint-layout').className,opacity:getComputedStyle(document.querySelector('.blueprint-layout')).opacity};
   document.querySelector('#architecture').scrollIntoView({block:'center',behavior:'auto'});
   document.querySelector('.architecture-more>summary').click();
   setTimeout(()=>{
     const archEl=document.querySelector('.implementation-proof article');
     const result={bp,arch:{cls:archEl.className,opacity:getComputedStyle(archEl).opacity},errors:window.__qaErrors};
     const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(result);document.body.appendChild(pre);
   },700);
 },700);
},100);
</script></body>""",1)
with tempfile.NamedTemporaryFile("w",suffix=".html",delete=False) as f:
    f.write(html); detailpath=f.name
res=subprocess.run([CHROME,"--headless","--no-sandbox","--disable-gpu","--run-all-compositor-stages-before-draw","--force-prefers-reduced-motion=reduce","--window-size=1440,1000","--virtual-time-budget=2300","--dump-dom",f"file://{detailpath}"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=True)
Path(detailpath).unlink(missing_ok=True)
m=re.search(r'<pre id="qaResult">(.*?)</pre>',res.stdout,re.S);assert m,res.stderr[-1200:]
details=json.loads(htmlmod.unescape(m.group(1)))
assert "is-visible" in details["bp"]["cls"] and details["bp"]["opacity"]=="1",details
assert "is-visible" in details["arch"]["cls"] and details["arch"]["opacity"]=="1",details
assert not details["errors"],details
print("DETAILS",details)

# Navigation/progress behavior.
html=build_html().replace("</body>",r"""
<script>
window.__qaErrors=[];
setTimeout(()=>{
 document.documentElement.style.scrollBehavior='auto';
 const state={top:document.querySelector('.desktop-nav a.is-active')?.getAttribute('href')||null,sections:{}};
 for(const sel of ['#workflow','#demo','#workspace','#reliability','#architecture','#roi']){
   document.querySelector(sel).scrollIntoView({block:'start',behavior:'auto'});
   updateReadingState();
   state.sections[sel]=document.querySelector('.desktop-nav a.is-active')?.getAttribute('href')||null;
 }
 window.scrollTo(0,(document.documentElement.scrollHeight-innerHeight)/2);updateReadingState();
 state.progress=document.querySelector('#presentationProgressBar').style.transform;
 state.errors=window.__qaErrors;
 const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(state);document.body.appendChild(pre);
},120);
</script></body>""",1)
with tempfile.NamedTemporaryFile("w",suffix=".html",delete=False) as f:
    f.write(html); navpath=f.name
res=subprocess.run([CHROME,"--headless","--no-sandbox","--disable-gpu","--run-all-compositor-stages-before-draw","--force-prefers-reduced-motion=reduce","--window-size=1440,1000","--virtual-time-budget=900","--dump-dom",f"file://{navpath}"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=True)
Path(navpath).unlink(missing_ok=True)
m=re.search(r'<pre id="qaResult">(.*?)</pre>',res.stdout,re.S);assert m,res.stderr[-1200:]
nav=json.loads(htmlmod.unescape(m.group(1)))
assert nav["top"] is None,nav
assert all(nav["sections"][s]==s for s in nav["sections"]),nav
assert nav["progress"].startswith("scaleX(") and nav["progress"]!="scaleX(0)",nav
assert not nav["errors"],nav
print("NAV",nav)

# Reduced-motion contract for the final presentation layer.
html=build_html().replace("</body>",r"""
<script>
setTimeout(()=>{
 const state={
   flow:getComputedStyle(document.querySelector('.flow-node')).animationName,
   follow:getComputedStyle(document.querySelector('.fc-two')).animationName,
   reveal:getComputedStyle(document.querySelector('.reveal-on-scroll')).transitionDuration
 };
 const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(state);document.body.appendChild(pre);
},100);
</script></body>""",1)
with tempfile.NamedTemporaryFile("w",suffix=".html",delete=False) as f:
    f.write(html); motionpath=f.name
res=subprocess.run([CHROME,"--headless","--no-sandbox","--disable-gpu","--run-all-compositor-stages-before-draw","--force-prefers-reduced-motion=reduce","--window-size=1440,1000","--virtual-time-budget=700","--dump-dom",f"file://{motionpath}"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=True)
Path(motionpath).unlink(missing_ok=True)
m=re.search(r'<pre id="qaResult">(.*?)</pre>',res.stdout,re.S);assert m,res.stderr[-1200:]
motion=json.loads(htmlmod.unescape(m.group(1)))
assert motion["flow"]=="none" and motion["follow"]=="none" and motion["reveal"]=="0s",motion
print("MOTION",motion)
print("FINAL_SHOWCASE_RUNTIME_AUDIT=PASS")

