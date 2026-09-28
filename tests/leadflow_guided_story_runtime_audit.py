import json,shutil,subprocess,tempfile,time,urllib.request,websocket

URL="http://127.0.0.1:8805/"

def browser(port,reduced):
    profile=tempfile.mkdtemp(prefix="lf-guided-")
    p=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--remote-allow-origins=*",f"--remote-debugging-port={port}",f"--user-data-dir={profile}","about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(120):
        try:
            tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"));tab=next(t for t in tabs if t.get("type")=="page" and t.get("url")=="about:blank");break
        except:time.sleep(.05)
    ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=10);seq=0;errs=[]
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
    c("Runtime.enable");c("Page.enable");c("Emulation.setDeviceMetricsOverride",{"width":1440,"height":950,"deviceScaleFactor":1,"mobile":False})
    if reduced:c("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-reduced-motion","value":"reduce"}]})
    c("Page.navigate",{"url":URL})
    for _ in range(120):
        ready=e("""(()=>document.readyState==="complete"&&!!window.LeadFlowStorytelling&&document.querySelector('.final-cta')?.classList.contains('reveal-on-scroll'))()""")
        if ready:break
        time.sleep(.05)
    else:raise AssertionError("LeadFlow app did not finish initializing")
    return p,profile,ws,e,errs

def close(p,profile,ws):
    try:ws.close()
    except:pass
    p.terminate();shutil.rmtree(profile,ignore_errors=True)

# Reduced motion: semantic sequence + cancellation.
p,profile,ws,e,errs=browser(9440,True)
try:
    e("document.documentElement.style.scrollBehavior='auto';document.querySelector('#guidedDemo').click()")
    time.sleep(.12)
    start=time.monotonic();chapters=[];last=None;final={}
    while time.monotonic()-start<10:
        st=e("""(()=>({
          open:document.querySelector('#tourStatus').classList.contains('open'),
          idx:document.querySelector('#tourIndex').textContent.trim(),
          chapter:document.querySelector('#tourChapter').textContent.trim(),
          beat:document.querySelector('#tourBeat').textContent.trim(),
          progress:parseFloat(document.querySelector('#tourProgressBar').style.width)||0,
          exec:document.querySelector('#execStatus').textContent.trim(),
          workflow:document.querySelector('#workflow').dataset.storyState||'',
          operations:document.querySelector('#workspace').dataset.storyState||'',
          reliability:document.querySelector('#reliability').dataset.storyState||'',
          architecture:document.querySelector('#architecture').dataset.storyState||'',
          timeout:document.querySelector('#reliability').dataset.incidentScenario||''
        }))()""")
        key=(st["idx"],st["chapter"])
        if key!=last:
            chapters.append((round(time.monotonic()-start,2),st.copy()));last=key
        final=st
        if not st["open"] and time.monotonic()-start>1:break
        time.sleep(.05)
    print("REDUCED_CHAPTERS",chapters)
    print("REDUCED_FINAL",final)
    names=[x[1]["chapter"] for x in chapters]
    for name in ["QUALIFICATION","DECISION","OPERATIONS","RECOVERY","SYSTEM TRACE","COMPLETE"]:
        assert name in names,(name,names)
    first_run=next(st for _,st in chapters if st["chapter"]=="QUALIFICATION")
    assert first_run["workflow"]=="complete",first_run
    assert final["exec"]=="COMPLETE",final
    assert final["workflow"]=="complete" and final["operations"]=="complete" and final["reliability"]=="complete" and final["architecture"]=="complete",final
    assert final["timeout"]=="timeout",final
    assert not errs,errs

    # Cancellation cleanup on a second run.
    e("document.querySelector('#guidedDemo').click()");time.sleep(.06)
    e("document.querySelector('#cancelTour').click()");time.sleep(.1)
    cancelled=e("""(()=>({
      open:document.querySelector('#tourStatus').classList.contains('open'),
      disabled:document.querySelector('#guidedDemo').disabled,
      storyActive:document.documentElement.classList.contains('story-active'),
      transient:document.querySelectorAll('.story-focus,.ops-story-focus,.incident-focus,.arch-story-focus').length
    }))()""")
    print("CANCEL",cancelled)
    assert cancelled=={"open":False,"disabled":False,"storyActive":False,"transient":0},cancelled
finally:close(p,profile,ws)

# Normal motion: chapter transitions must occur only after the prior director settled.
p,profile,ws,e,errs=browser(9441,False)
try:
    e("document.documentElement.style.scrollBehavior='auto';document.querySelector('#guidedDemo').click()")
    time.sleep(.12)
    start=time.monotonic();events=[];last=None;final={}
    while time.monotonic()-start<40:
        st=e("""(()=>({
          open:document.querySelector('#tourStatus').classList.contains('open'),
          idx:document.querySelector('#tourIndex').textContent.trim(),
          chapter:document.querySelector('#tourChapter').textContent.trim(),
          beat:document.querySelector('#tourBeat').textContent.trim(),
          progress:parseFloat(document.querySelector('#tourProgressBar').style.width)||0,
          exec:document.querySelector('#execStatus').textContent.trim(),
          workflow:document.querySelector('#workflow').dataset.storyState||'',
          operations:document.querySelector('#workspace').dataset.storyState||'',
          reliability:document.querySelector('#reliability').dataset.storyState||'',
          architecture:document.querySelector('#architecture').dataset.storyState||''
        }))()""")
        key=(st["idx"],st["chapter"])
        if key!=last:
            now=round(time.monotonic()-start,2);events.append((now,st.copy()));print("NORMAL",now,st);last=key
        final=st
        if not st["open"] and time.monotonic()-start>5:break
        time.sleep(.12)
    by={st["chapter"]:(t,st) for t,st in events}
    for name in ["LEAD JOURNEY","QUALIFICATION","DECISION","OPERATIONS","RECOVERY","SYSTEM TRACE","COMPLETE"]:
        assert name in by,(name,events)
    assert by["QUALIFICATION"][1]["workflow"]=="complete",by
    assert by["DECISION"][1]["exec"]=="COMPLETE",by
    assert by["RECOVERY"][1]["operations"]=="complete",by
    assert by["SYSTEM TRACE"][1]["reliability"]=="complete",by
    assert by["COMPLETE"][1]["architecture"]=="complete",by
    total=time.monotonic()-start
    assert total>15,("tour raced",total,events)
    assert not errs,errs
    print("NORMAL_TOTAL",round(total,2))
finally:close(p,profile,ws)

print("GUIDED_STORY_RUNTIME_AUDIT=PASS")

