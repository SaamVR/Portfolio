import json,shutil,subprocess,tempfile,time,urllib.request,websocket
URL="http://127.0.0.1:8805/"

def audit(width,height,theme,port):
    profile=tempfile.mkdtemp(prefix="lf-v3-a11y-")
    p=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--remote-allow-origins=*",f"--remote-debugging-port={port}",f"--user-data-dir={profile}","about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    errs=[]
    try:
        for _ in range(120):
            try:
                tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"));tab=next(t for t in tabs if t.get("type")=="page" and t.get("url")=="about:blank");break
            except:time.sleep(.05)
        ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=10);seq=0
        def c(method,params=None):
            nonlocal seq
            seq+=1;i=seq;ws.send(json.dumps({"id":i,"method":method,"params":params or {}}))
            while True:
                m=json.loads(ws.recv())
                if m.get("method")=="Runtime.exceptionThrown":errs.append(m)
                if m.get("id")==i:
                    if "error" in m:raise RuntimeError(m["error"])
                    return m.get("result",{})
        def e(expr):return c("Runtime.evaluate",{"expression":expr,"returnByValue":True})["result"].get("value")
        c("Runtime.enable");c("Page.enable");c("Emulation.setDeviceMetricsOverride",{"width":width,"height":height,"deviceScaleFactor":1,"mobile":width<600});c("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-reduced-motion","value":"reduce"}]});c("Page.navigate",{"url":URL});time.sleep(.9)
        e(f"document.documentElement.dataset.theme='{theme}';document.documentElement.style.scrollBehavior='auto';document.querySelector('#workflow').scrollIntoView({{block:'center',behavior:'auto'}})")
        time.sleep(.25)
        e("document.querySelector('[data-lead-preset=\"hot\"]').click();document.querySelector('#leadForm').requestSubmit()")
        for _ in range(100):
            if e("document.querySelector('#execStatus').textContent")=="COMPLETE":break
            time.sleep(.04)
        e("document.querySelector('#workspace').scrollIntoView({block:'center',behavior:'auto'})");time.sleep(.35)
        e("document.querySelector('[data-edge=\"timeout\"]').click()");time.sleep(.2)
        e("document.querySelector('#architecture').scrollIntoView({block:'center',behavior:'auto'})");time.sleep(.25)
        script=r"""(()=> {
          const parse=s=>{const m=String(s).match(/rgba?(([^)]+))/);if(!m)return null;const p=m[1].split(',').map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
          const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
          const lum=c=>{const q=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*q(c.r)+.7152*q(c.g)+.0722*q(c.b)};
          const ratio=(a,b)=>{const A=lum(a),B=lum(b);return(Math.max(A,B)+.05)/(Math.min(A,B)+.05)};
          const opacity=el=>{let o=1;for(let n=el;n;n=n.parentElement){const v=parseFloat(getComputedStyle(n).opacity);o*=Number.isFinite(v)?v:1}return o};
          const bgFor=el=>{const chain=[];for(let n=el;n;n=n.parentElement)chain.push(n);chain.reverse();let b={r:255,g:255,b:255,a:1};for(const n of chain){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0)b=over(c,b)}return b};
          const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"&&opacity(el)>.02&&!el.closest('details:not([open])')};
          const roots=[document.querySelector('#workflow'),document.querySelector('#workspace'),document.querySelector('#reliability'),document.querySelector('#architecture'),document.querySelector('#tourStatus')];
          const texts=roots.flatMap(root=>root?[...root.querySelectorAll('*')]:[]).filter(el=>visible(el)&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
          const small=texts.filter(el=>parseFloat(getComputedStyle(el).fontSize)<12).map(el=>({text:el.textContent.trim().slice(0,70),size:parseFloat(getComputedStyle(el).fontSize),cls:String(el.className||'')}));
          const low=[];
          for(const el of texts){const s=getComputedStyle(el),fg0=parse(s.color);if(!fg0)continue;const bg=bgFor(el),fg=over({...fg0,a:fg0.a*opacity(el)},bg),cr=ratio(fg,bg),fs=parseFloat(s.fontSize),fw=parseInt(s.fontWeight)||400,need=(fs>=24||(fs>=18.66&&fw>=700))?3:4.5;if(cr<need)low.push({text:el.textContent.trim().replace(/s+/g,' ').slice(0,70),ratio:+cr.toFixed(2),size:fs,cls:String(el.className||'')})}
          const controls=['#workflowReplay','#opsStoryReplay','#architectureReplay','[data-edge="duplicate"]','[data-edge="timeout"]','[data-edge="review"]','#cancelTour'].map(sel=>document.querySelector(sel)).filter(Boolean).filter(visible).map(el=>{const r=el.getBoundingClientRect();return{sel:el.id||el.dataset.edge||el.className,w:+r.width.toFixed(1),h:+r.height.toFixed(1)}})
          return{small,low,controls,docW:document.documentElement.scrollWidth,viewport:innerWidth,errors:window.__qaErrors||[]}
        })()"""
        out=e(script)
        print(theme,width,{"small":len(out["small"]),"low":len(out["low"]),"controls":out["controls"],"docW":out["docW"],"viewport":out["viewport"]})
        if out["small"]:print(" small",out["small"][:20])
        if out["low"]:print(" low",out["low"][:20])
        assert out["docW"]<=out["viewport"],out
        assert not errs,errs
        return out
    finally:
        try:ws.close()
        except:pass
        p.terminate();shutil.rmtree(profile,ignore_errors=True)

results={}
for i,(theme,w,h) in enumerate([("dark",1440,950),("light",1440,950),("dark",390,844),("light",390,844)]):
    results[f"{theme}-{w}"]=audit(w,h,theme,9460+i)
for key,out in results.items():
    assert out["small"]==[],(key,"small",out["small"])
    assert out["low"]==[],(key,"contrast",out["low"])
    assert out["docW"]<=out["viewport"],(key,"overflow",out["docW"],out["viewport"])
    for control in out["controls"]:
        assert control["h"]>=44,(key,"target",control)
print("V3_STORYTELLING_ACCESSIBILITY_RUNTIME_AUDIT=PASS")
