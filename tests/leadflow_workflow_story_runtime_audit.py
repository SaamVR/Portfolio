import json,shutil,subprocess,tempfile,time,urllib.request,websocket,base64,os

URL="http://127.0.0.1:8805/"
OUT="/tmp/lf-v3-workflow"
os.makedirs(OUT,exist_ok=True)

def audit(width,height):
    profile=tempfile.mkdtemp(prefix="lf-wf-");port=9400+(0 if width==1440 else 1)
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
        c("Page.navigate",{"url":URL});time.sleep(1.0)
        e("document.documentElement.style.scrollBehavior='auto';document.querySelector('#workflow').scrollIntoView({block:'center',behavior:'auto'})")
        time.sleep(.35)
        out=e("""(()=>{const s=document.querySelector('#workflow'),packet=document.querySelector('#workflowStoryPacket');return{state:s.dataset.storyState,caption:document.querySelector('#workflowStoryCaption').textContent.trim(),detail:document.querySelector('#workflowStoryDetail').textContent.trim(),stages:[...s.querySelectorAll('.workflow-stage')].map(x=>({done:x.classList.contains('story-stage-complete'),focus:x.classList.contains('story-focus')})),connectors:[...s.querySelectorAll('.workflow-story-connector')].map(x=>x.classList.contains('story-connector-complete')),packetAnimation:getComputedStyle(packet).animationName,replayH:document.querySelector('#workflowReplay').getBoundingClientRect().height,docW:document.documentElement.scrollWidth,viewport:innerWidth}})()""")
        print(width,out)
        assert out["state"]=="complete",out
        assert "prepared" in out["caption"].lower(),out
        assert all(x["done"] for x in out["stages"]),out
        assert all(out["connectors"]),out
        assert out["packetAnimation"]=="none",out
        assert out["replayH"]>=44 and out["docW"]<=out["viewport"],out
        assert out["viewport"]==width,(width,out)
        r=c("Page.captureScreenshot",{"format":"png","fromSurface":True});open(f"{OUT}/workflow-{width}.png","wb").write(base64.b64decode(r["data"]))
        e("document.querySelector('#workflowReplay').click()");time.sleep(.25)
        assert e("document.querySelector('#workflow').dataset.storyState")=="complete"
        assert not errs,errs
    finally:
        try:ws.close()
        except:pass
        p.terminate();shutil.rmtree(profile,ignore_errors=True)

for case in ((1440,950),(390,844)):audit(*case)
print("WORKFLOW_STORY_RUNTIME_AUDIT=PASS")

