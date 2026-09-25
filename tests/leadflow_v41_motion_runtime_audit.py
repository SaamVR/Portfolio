import base64,json,os,shutil,subprocess,tempfile,time,urllib.request,websocket
URL="http://127.0.0.1:8805/"
OUT="/tmp/leadflow-v41-motion"
os.makedirs(OUT,exist_ok=True)

def audit(width,height,port):
    profile=tempfile.mkdtemp(prefix="lf-v41-")
    err_path=os.path.join(profile,"chrome-stderr.log")
    err_file=open(err_path,"w")
    proc=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--hide-scrollbars","--remote-allow-origins=*",
        f"--remote-debugging-port={port}",f"--user-data-dir={profile}","about:blank"],stdout=subprocess.DEVNULL,stderr=err_file)
    errors=[]
    try:
        tab=None
        for _ in range(300):
            try:
                tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
                pages=[x for x in tabs if x.get("type")=="page"]
                if pages:
                    tab=pages[0]
                    break
            except Exception:
                if proc.poll() is not None:break
                time.sleep(.05)
        if tab is None:
            err_file.flush()
            detail=open(err_path).read()[-3000:]
            raise RuntimeError("Chrome did not expose a page target. "+detail)
        ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=20);seq=0
        def call(method,params=None):
            nonlocal seq
            seq+=1;i=seq;ws.send(json.dumps({"id":i,"method":method,"params":params or {}}))
            while True:
                m=json.loads(ws.recv())
                if m.get("method")=="Runtime.exceptionThrown":errors.append(m)
                if m.get("id")==i:
                    if "error" in m:raise RuntimeError(m["error"])
                    return m.get("result",{})
        def ev(expr):return call("Runtime.evaluate",{"expression":expr,"returnByValue":True})["result"].get("value")
        call("Runtime.enable");call("Page.enable")
        call("Emulation.setDeviceMetricsOverride",{"width":width,"height":height,"deviceScaleFactor":1,"mobile":width<600})
        call("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-reduced-motion","value":"no-preference"}]})
        call("Page.navigate",{"url":URL})
        for _ in range(120):
            time.sleep(.05)
            if ev("document.readyState==='complete' && !!window.LeadFlowStorytelling && !!document.querySelector('#guidedDemo')"):break
        ev("localStorage.clear();scrollTo(0,0)")
        time.sleep(.15)
        groups=ev(r"""(()=>[...document.querySelectorAll('.brief-grid,.workflow-map,.implementation-proof')].map(g=>[...g.querySelectorAll(':scope > article')].map(x=>x.dataset.revealDelay||'')))()""")
        assert groups==[["1","2","3"],["1","2","3","4"],["1","2","3","4"]],groups
        log=[];captured=set()
        ev("document.querySelector('#guidedDemo').click()")
        started=time.time()
        while time.time()-started<50:
            s=ev(r"""(()=>({t:+performance.now().toFixed(1),y:+scrollY.toFixed(2),chapter:document.querySelector('#tourChapter')?.textContent?.trim()||'',beat:document.querySelector('#tourBeat')?.textContent?.trim()||'',wf:document.querySelector('#workflow')?.dataset.storyState||'',exec:document.querySelector('#execStatus')?.textContent?.trim()||'',done:document.querySelectorAll('#steps .exec-step.done').length,ops:document.querySelector('#workspace')?.dataset.storyState||'',rel:document.querySelector('#reliability')?.dataset.storyState||'',arch:document.querySelector('#architecture')?.dataset.storyState||'',open:document.querySelector('#tourStatus')?.classList.contains('open')||false,button:document.querySelector('#guidedDemo .guided-btn-label')?.textContent?.trim()||''}))()""")
            log.append(s);ch=s["chapter"]
            active=(ch=="LEAD JOURNEY" and s["wf"]=="playing") or (ch=="QUALIFICATION" and s["exec"] not in ("","READY","IDLE","COMPLETE")) or (ch=="DECISION" and "92 / 100" in s["beat"]) or (ch=="OPERATIONS" and s["ops"]=="playing") or (ch=="RECOVERY" and s["rel"]=="playing") or (ch=="SYSTEM TRACE" and s["arch"]=="playing") or ch=="COMPLETE"
            if active and ch and ch not in captured:
                captured.add(ch)
                data=call("Page.captureScreenshot",{"format":"png","captureBeyondViewport":False}).get("data")
                if data:open(os.path.join(OUT,f"{width}-{ch.lower().replace(' ','-')}.png"),"wb").write(base64.b64decode(data))
            if not s["open"] and "Watch LeadFlow" in s["button"] and len(log)>20:break
            time.sleep(.025)
        assert log and log[-1]["chapter"]=="COMPLETE",(width,log[-1] if log else None)
        transitions=[];last=None
        for i,s in enumerate(log):
            if s["chapter"] and s["chapter"]!=last:transitions.append((i,s["chapter"]));last=s["chapter"]
        predicates={
          "LEAD JOURNEY":lambda x:x["wf"]=="playing",
          "QUALIFICATION":lambda x:x["exec"] not in ("","READY","IDLE","COMPLETE"),
          "DECISION":lambda x:"92 / 100" in x["beat"],
          "OPERATIONS":lambda x:x["ops"]=="playing",
          "RECOVERY":lambda x:x["rel"]=="playing",
          "SYSTEM TRACE":lambda x:x["arch"]=="playing"
        }
        summary=[]
        for n,(i,ch) in enumerate(transitions):
            j=transitions[n+1][0] if n+1<len(transitions) else len(log);seg=log[i:j]
            settle=None
            for k in range(4,len(seg)):
                ys=[seg[z]["y"] for z in range(k-4,k+1)]
                if max(ys)-min(ys)<=.75:settle=seg[k];break
            pred=predicates.get(ch);content=next((x for x in seg if pred and pred(x)),None)
            gap=None if not settle or not content else round(content["t"]-settle["t"],1)
            if ch in predicates:
                assert settle,(width,ch,"camera did not settle")
                assert content,(width,ch,"chapter action did not start")
                assert gap>=0,(width,ch,"content started during camera travel",gap)
            summary.append((ch,gap))
        qual=[x["done"] for x in log if x["chapter"]=="QUALIFICATION"]
        assert any(0<x<6 for x in qual),(width,"qualification progress jumped",sorted(set(qual)))
        assert not errors,errors
        # Cancel during the first camera move.
        call("Page.navigate",{"url":URL});time.sleep(.8)
        ev("scrollTo(0,0);document.querySelector('#guidedDemo').click()");time.sleep(.08)
        ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");time.sleep(.3)
        cancelled=ev(r"""(()=>({open:document.querySelector('#tourStatus').classList.contains('open'),button:document.querySelector('#guidedDemo .guided-btn-label').textContent.trim(),playing:[...document.querySelectorAll('[data-story-state="playing"]')].length}))()""")
        assert cancelled["open"]==False and "Watch LeadFlow" in cancelled["button"] and cancelled["playing"]==0,(width,cancelled)
        print("MOTION",width,summary,"QUAL",sorted(set(qual)),"CANCEL",cancelled)
    finally:
        try:ws.close()
        except:pass
        proc.terminate()
        try:err_file.close()
        except:pass
        shutil.rmtree(profile,ignore_errors=True)

audit(1440,950,9640)
audit(390,844,9641)
print("V41_MOTION_RUNTIME=PASS")
