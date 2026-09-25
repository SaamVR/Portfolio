import json,shutil,subprocess,tempfile,time,urllib.request,websocket,base64,os
URL="http://127.0.0.1:8805/";OUT="/tmp/lf-v3-architecture";os.makedirs(OUT,exist_ok=True)

def run(width,height):
    profile=tempfile.mkdtemp(prefix="lf-arch-");port=9430+(0 if width==1440 else 1)
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
        e("document.documentElement.style.scrollBehavior='auto';document.querySelector('#architecture').scrollIntoView({block:'center',behavior:'auto'})")
        time.sleep(.35)
        out=e("""(()=>{const s=document.querySelector('#architecture'),a=s.querySelector('.architecture');return{
          state:s.dataset.storyState,
          caption:document.querySelector('#architectureStoryCaption').textContent.trim(),
          detail:document.querySelector('#architectureStoryDetail').textContent.trim(),
          branch:a.classList.contains('arch-branch-active'),
          reconverged:a.classList.contains('arch-reconverged'),
          nodes:[...s.querySelectorAll('[data-arch-node]')].map(x=>({node:x.dataset.archNode,done:x.classList.contains('arch-story-complete'),focus:x.classList.contains('arch-story-focus')})),
          mainOpacity:getComputedStyle(document.querySelector('#architecturePayload')).opacity,
          rulesOpacity:getComputedStyle(document.querySelector('#architectureRulesPayload')).opacity,
          crmOpacity:getComputedStyle(document.querySelector('#architectureCrmPayload')).opacity,
          replayH:document.querySelector('#architectureReplay').getBoundingClientRect().height,
          docW:document.documentElement.scrollWidth,viewport:innerWidth
        }})()""")
        print(width,out)
        assert out["state"]=="complete",out
        assert out["branch"] and out["reconverged"],out
        assert all(n["done"] for n in out["nodes"]),out
        assert [n["node"] for n in out["nodes"] if n["focus"]]==["next"],out
        assert "Trace complete" in out["caption"],out
        assert out["mainOpacity"]=="1",out
        assert out["replayH"]>=44 and out["docW"]<=out["viewport"] and out["viewport"]==width,out
        e("document.querySelector('#architectureReplay').click()");time.sleep(.3)
        assert e("document.querySelector('#architecture').dataset.storyState")=="complete"
        assert not errs,errs
        r=c("Page.captureScreenshot",{"format":"png","fromSurface":True});open(f"{OUT}/architecture-{width}.png","wb").write(base64.b64decode(r["data"]))
    finally:
        try:ws.close()
        except:pass
        p.terminate();shutil.rmtree(profile,ignore_errors=True)

for case in ((1440,950),(390,844)):run(*case)
print("ARCHITECTURE_STORY_RUNTIME_AUDIT=PASS")

