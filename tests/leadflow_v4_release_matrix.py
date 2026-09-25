import json,shutil,subprocess,tempfile,time,urllib.request,websocket
URL="http://127.0.0.1:8805/"

def audit(width,height,theme,port,run_presets=False):
    profile=tempfile.mkdtemp(prefix="lf-release-")
    proc=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--remote-allow-origins=*",
        f"--remote-debugging-port={port}",f"--user-data-dir={profile}","about:blank"],
        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    errs=[]
    try:
        for _ in range(120):
            try:
                tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
                tab=next(x for x in tabs if x.get("type")=="page" and x.get("url")=="about:blank");break
            except:time.sleep(.05)
        if not tab: raise RuntimeError("Chrome DevTools page did not start")\n        ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=10);seq=0
        def c(method,params=None):
            nonlocal seq
            seq+=1;i=seq
            ws.send(json.dumps({"id":i,"method":method,"params":params or {}}))
            while True:
                m=json.loads(ws.recv())
                if m.get("method")=="Runtime.exceptionThrown":errs.append(m)
                if m.get("id")==i:
                    if "error" in m:raise RuntimeError(m["error"])
                    return m.get("result",{})
        def e(expr):return c("Runtime.evaluate",{"expression":expr,"returnByValue":True})["result"].get("value")
        c("Runtime.enable");c("Page.enable")
        c("Emulation.setDeviceMetricsOverride",{"width":width,"height":height,"deviceScaleFactor":1,"mobile":width<600})
        c("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-reduced-motion","value":"reduce"}]})
        c("Page.navigate",{"url":URL})
        ready=False
        for _ in range(50):
            time.sleep(.05)
            try:
                ready=bool(e("document.readyState==='complete' && !!window.LeadFlowStorytelling"))
            except Exception:
                ready=False
            if ready:break
        assert ready,(theme,width,"V3 runtime did not become ready")
        e(f"document.documentElement.dataset.theme='{theme}';document.documentElement.style.scrollBehavior='auto'")
        time.sleep(.12)
        out=e(r"""(()=> {
          const hiddenByAncestor=el=>!!el.closest('[hidden],details:not([open]),[aria-hidden="true"],.crm-view:not(.active),.followup-modal:not(.open),.crm-modal:not(.open)');
          const visible=el=>{
            if(hiddenByAncestor(el))return false;
            const s=getComputedStyle(el),r=el.getBoundingClientRect();
            let opacity=1;for(let n=el;n;n=n.parentElement){const o=parseFloat(getComputedStyle(n).opacity);if(Number.isFinite(o))opacity*=o}
            return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"&&opacity>.02;
          };
          const leaves=[...document.querySelectorAll('body *')].filter(el=>visible(el)&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
          const small=leaves.filter(el=>parseFloat(getComputedStyle(el).fontSize)<12).map(el=>({
            text:el.textContent.trim().replace(/\s+/g,' ').slice(0,80),
            size:+parseFloat(getComputedStyle(el).fontSize).toFixed(2),
            tag:el.tagName,cls:String(el.className||'').slice(0,80)
          }));
          const controls=['#runAutomation','#guidedDemo','#workflowReplay','#opsStoryReplay','#architectureReplay','#themeToggle']
            .map(sel=>document.querySelector(sel)).filter(Boolean).filter(visible)
            .map(el=>{const r=el.getBoundingClientRect();return{id:el.id,w:+r.width.toFixed(1),h:+r.height.toFixed(1)}});
          return{
            title:document.title,
            v3:!!window.LeadFlowStorytelling,
            docW:document.documentElement.scrollWidth,
            viewport:innerWidth,
            small,
            controls,
            h1:+parseFloat(getComputedStyle(document.querySelector('h1')).fontSize).toFixed(1),
            body:+parseFloat(getComputedStyle(document.body).fontSize).toFixed(1)
          }
        })()""")
        assert out["v3"] and out["docW"]<=out["viewport"],out
        assert out["viewport"]==width,out
        assert not out["small"],(theme,width,out["small"][:30])
        for ctl in out["controls"]:
            assert ctl["h"]>=44,(theme,width,ctl)
        assert not errs,errs
        print("VIEW",theme,width,{"docW":out["docW"],"small":len(out["small"]),"h1":out["h1"],"body":out["body"],"controls":out["controls"]})
        if run_presets:
            results=[]
            for preset,score,status in [("hot","92","HIGH PRIORITY"),("review","64","NEEDS REVIEW"),("nurture","33","NURTURE")]:
                e("document.querySelector('[data-lead-preset=\"" + preset + "\"]').click();document.querySelector('#leadForm').requestSubmit()")
                for _ in range(120):
                    if e("document.querySelector('#execStatus').textContent.trim()")=="COMPLETE":break
                    time.sleep(.04)
                result=e("""(()=>({score:document.querySelector('#scoreValue').textContent.trim(),status:document.querySelector('#temperature').textContent.trim(),events:document.querySelector('#eventCount').textContent.trim(),backend:document.querySelector('#backendStatus').textContent.trim()}))()""")
                assert result["score"]==score and result["status"]==status,(preset,result)
                assert result["events"]=="16 events",(preset,result)
                results.append((preset,result))
            print("PRESETS",results)
        return out
    finally:
        try:ws.close()
        except:pass
        proc.terminate();shutil.rmtree(profile,ignore_errors=True)

cases=[]
port=9470
for theme in ("dark","light"):
    for width,height in ((390,844),(768,900),(1024,900),(1440,950)):
        cases.append(audit(width,height,theme,port,run_presets=(theme=="dark" and width==1440)))
        port+=1
print("V4_RELEASE_MATRIX=PASS")
