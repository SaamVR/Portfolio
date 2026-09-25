import json,shutil,subprocess,tempfile,time,urllib.request,websocket,base64,os
URL="http://127.0.0.1:8805/";OUT="/tmp/lf-v3-reliability";os.makedirs(OUT,exist_ok=True)

def run(width,height):
    profile=tempfile.mkdtemp(prefix="lf-rel-");port=9420+(0 if width==1440 else 1)
    p=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--remote-allow-origins=*",f"--remote-debugging-port={port}",f"--user-data-dir={profile}","about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    errs=[]
    try:
        for _ in range(100):
            try:
                tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"));t=next(x for x in tabs if x.get("type")=="page" and x.get("url")=="about:blank");break
            except:time.sleep(.05)
        ws=websocket.create_connection(t["webSocketDebuggerUrl"],timeout=10);seq=0
        def c(m,pa=None):
            nonlocal seq
            seq+=1;i=seq;ws.send(json.dumps({"id":i,"method":m,"params":pa or {}}))
            while 1:
                x=json.loads(ws.recv())
                if x.get("method")=="Runtime.exceptionThrown":errs.append(x)
                if x.get("id")==i:
                    if "error" in x:raise RuntimeError(x["error"])
                    return x.get("result",{})
        def e(x):return c("Runtime.evaluate",{"expression":x,"returnByValue":True})["result"].get("value")
        c("Runtime.enable");c("Page.enable")
        c("Emulation.setDeviceMetricsOverride",{"width":width,"height":height,"deviceScaleFactor":1,"mobile":width<600})
        c("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-reduced-motion","value":"reduce"}]})
        c("Page.navigate",{"url":URL});time.sleep(.9)
        e("document.documentElement.style.scrollBehavior='auto';document.querySelector('#reliability').scrollIntoView({block:'center',behavior:'auto'})")
        time.sleep(.2)
        for scenario in ("duplicate","review","timeout"):
            e(f"document.querySelector('[data-edge=\"{scenario}\"]').click()")
            for _ in range(80):
                state=e("document.querySelector('#reliability').dataset.storyState")
                active=e("document.querySelector('#reliability').dataset.incidentScenario")
                if state=="complete" and active==scenario:break
                time.sleep(.05)
            else:raise AssertionError("reliability story incomplete: "+scenario)
            out=e("""(()=>{const s=document.querySelector('#reliability');return{
              state:s.dataset.storyState,
              scenario:s.dataset.incidentScenario,
              beats:[...s.querySelectorAll('[data-incident-beat]')].map(x=>({done:x.classList.contains('incident-complete'),focus:x.classList.contains('incident-focus')})),
              active:[...s.querySelectorAll('[data-incident-scene].active')].map(x=>x.dataset.incidentScene),
              logRows:document.querySelectorAll('#reliabilityLog>div').length,
              boundary:document.querySelector('#incidentBoundary').textContent.trim(),
              boundaryVisible:document.querySelector('#incidentBoundary').classList.contains('visible'),
              retryVisible:document.querySelector('#incidentRetryPlan').classList.contains('visible'),
              timeoutFailed:document.querySelector('.timeout-link').classList.contains('failed'),
              count:document.querySelector('#incidentDuplicateCount').textContent.trim(),
              human:document.querySelector('.human-route').classList.contains('selected'),
              salesDim:document.querySelector('.sales-route').classList.contains('dimmed'),
              docW:document.documentElement.scrollWidth,viewport:innerWidth
            }})()""")
            print(width,scenario,out)
            assert out["state"]=="complete" and out["scenario"]==scenario,out
            assert all(b["done"] for b in out["beats"]) and not any(b["focus"] for b in out["beats"]),out
            assert out["active"]==[scenario] and out["logRows"]==4,out
            assert out["docW"]<=out["viewport"] and out["viewport"]==width,out
            if scenario=="duplicate":
                assert "→" in out["count"] and out["count"].split("→")[0].strip()==out["count"].split("→")[1].replace("records","").strip(),out
            if scenario=="review":
                assert out["human"] and out["salesDim"],out
            if scenario=="timeout":
                assert out["boundary"]=="DELIVERY RETRY REQUIRES A CONNECTED CRM" and out["boundaryVisible"],out
                assert out["retryVisible"] and out["timeoutFailed"],out
        # Re-entrancy: timeout should win after rapid scenario changes.
        e("document.querySelector('[data-edge=\"duplicate\"]').click();document.querySelector('[data-edge=\"timeout\"]').click()")
        for _ in range(80):
            state=e("document.querySelector('#reliability').dataset.storyState")
            active=e("document.querySelector('#reliability').dataset.incidentScenario")
            if state=="complete" and active=="timeout":break
            time.sleep(.05)
        else:raise AssertionError("reliability re-entry story incomplete")
        final=e("""(()=>({state:document.querySelector('#reliability').dataset.storyState,scenario:document.querySelector('#reliability').dataset.incidentScenario,active:[...document.querySelectorAll('#reliability [data-incident-scene].active')].map(x=>x.dataset.incidentScene)}))()""")
        assert final["state"]=="complete" and final["scenario"]=="timeout" and final["active"]==["timeout"],final
        assert not errs,errs
        r=c("Page.captureScreenshot",{"format":"png","fromSurface":True});open(f"{OUT}/timeout-{width}.png","wb").write(base64.b64decode(r["data"]))
    finally:
        try:ws.close()
        except:pass
        p.terminate();shutil.rmtree(profile,ignore_errors=True)

for case in ((1440,950),(390,844)):run(*case)
print("RELIABILITY_STORY_RUNTIME_AUDIT=PASS")

