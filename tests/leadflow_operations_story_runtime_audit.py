import json,shutil,subprocess,tempfile,time,urllib.request,websocket,base64,os
URL="http://127.0.0.1:8805/";OUT="/tmp/lf-v3-ops";os.makedirs(OUT,exist_ok=True)

def run(width,height):
    profile=tempfile.mkdtemp(prefix="lf-ops-");port=9410+(0 if width==1440 else 1)
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
        c("Page.navigate",{"url":URL});time.sleep(1)
        e("document.documentElement.style.scrollBehavior='auto';document.querySelector('#demo').scrollIntoView({block:'center',behavior:'auto'});document.querySelector('[data-lead-preset=\"hot\"]').click();document.querySelector('#leadForm').requestSubmit()")
        for _ in range(100):
            if e("document.querySelector('#execStatus').textContent")=="COMPLETE":break
            time.sleep(.05)
        else:raise AssertionError("first workflow incomplete")
        e("document.querySelector('#workspace').scrollIntoView({block:'center',behavior:'auto'})")
        time.sleep(.45)
        first=e("""(()=>({state:document.querySelector('#workspace').dataset.storyState,total:document.querySelector('#opsTotal').textContent.trim(),headline:document.querySelector('#opsStoryHeadline').textContent.trim(),detail:document.querySelector('#opsStoryDetail').textContent.trim(),replayDisabled:document.querySelector('#opsStoryReplay').disabled,row:!!document.querySelector('#opsPipelineRows tr[data-story-lead-id^="lead-"]'),focus:document.querySelectorAll('#workspace .ops-story-focus').length,docW:document.documentElement.scrollWidth,viewport:innerWidth}))()""")
        print(width,"INSERT",first)
        assert first["state"]=="complete" and first["total"]=="4",first
        assert "Sarah" in first["headline"] and "92/100" in first["headline"],first
        assert first["row"] and not first["replayDisabled"] and first["focus"]==0,first
        assert first["docW"]<=first["viewport"] and first["viewport"]==width,first
        r=c("Page.captureScreenshot",{"format":"png","fromSurface":True});open(f"{OUT}/ops-insert-{width}.png","wb").write(base64.b64decode(r["data"]))

        # Duplicate/upsert: same Sarah + company; pipeline must remain four.
        e("document.querySelector('#demo').scrollIntoView({block:'center',behavior:'auto'});document.querySelector('[data-lead-preset=\"hot\"]').click();document.querySelector('#leadForm').requestSubmit()")
        for _ in range(100):
            if e("document.querySelector('#execStatus').textContent")=="COMPLETE":break
            time.sleep(.05)
        else:raise AssertionError("duplicate workflow incomplete")
        e("document.querySelector('#workspace').scrollIntoView({block:'center',behavior:'auto'})")
        time.sleep(.45)
        duplicate=e("""(()=>({state:document.querySelector('#workspace').dataset.storyState,total:document.querySelector('#opsTotal').textContent.trim(),headline:document.querySelector('#opsStoryHeadline').textContent.trim(),detail:document.querySelector('#opsStoryDetail').textContent.trim(),rows:document.querySelectorAll('#opsPipelineRows tr').length}))()""")
        print(width,"UPDATE",duplicate)
        assert duplicate["state"]=="complete" and duplicate["total"]=="4",duplicate
        assert "pipeline count stayed truthful" in duplicate["detail"].lower(),duplicate
        assert duplicate["rows"]==4,duplicate
        assert not errs,errs
    finally:
        try:ws.close()
        except:pass
        p.terminate();shutil.rmtree(profile,ignore_errors=True)

for case in ((1440,950),(390,844)):run(*case)
print("OPERATIONS_STORY_RUNTIME_AUDIT=PASS")

