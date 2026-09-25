import base64,json,os,shutil,subprocess,tempfile,time,urllib.request,websocket
URL="http://127.0.0.1:8812/"
OUT="/tmp/lf-pro-runtime"
os.makedirs(OUT,exist_ok=True)

profile=tempfile.mkdtemp(prefix="lf-pro-")
port=9560
proc=subprocess.Popen([
    "/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu",
    "--remote-allow-origins=*",f"--remote-debugging-port={port}",
    f"--user-data-dir={profile}","about:blank"
],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
errs=[]
try:
    for _ in range(120):
        try:
            tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
            tab=next(x for x in tabs if x.get("type")=="page" and x.get("url")=="about:blank")
            break
        except Exception: time.sleep(.05)
    ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=10)
    seq=0
    def c(method,params=None):
        nonlocal_seq=None
        global seq
        seq+=1;i=seq
        ws.send(json.dumps({"id":i,"method":method,"params":params or {}}))
        while True:
            m=json.loads(ws.recv())
            if m.get("method")=="Runtime.exceptionThrown":errs.append(m)
            if m.get("id")==i:
                if "error" in m: raise RuntimeError(m["error"])
                return m.get("result",{})
    def e(expr):
        r=c("Runtime.evaluate",{"expression":expr,"returnByValue":True})
        if r.get("exceptionDetails"): raise RuntimeError(r["exceptionDetails"])
        return r["result"].get("value")
    c("Runtime.enable");c("Page.enable")
    c("Emulation.setDeviceMetricsOverride",{"width":1440,"height":950,"deviceScaleFactor":1,"mobile":False})
    c("Page.navigate",{"url":URL})
    for _ in range(100):
        if e("document.readyState")=="complete": break
        time.sleep(.05)
    c("Page.bringToFront")
    e("window.focus()")
    base=e("""(()=>({
      ready:document.readyState,
      text:document.body.innerText.length,
      docW:document.documentElement.scrollWidth,
      viewport:innerWidth,
      overlay:!!document.querySelector('[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay'),
      story:!!window.LeadFlowStorytelling
    }))()""")
    print("BASE",base,"exceptions",len(errs))
    assert base["ready"]=="complete" and base["text"]>1000 and base["docW"]<=base["viewport"] and not base["overlay"] and base["story"]
    assert not errs,errs

    # Workflow semantic token states at normal motion.
    e("document.querySelector('#workflowReplay').click()")
    samples=[]
    for wait in (.08,1.25,1.25,1.25):
        time.sleep(wait)
        samples.append(e("""(()=>({label:document.querySelector('#workflowStoryPacket b').textContent.trim(),tone:document.querySelector('#workflowStoryPacket').dataset.tone,caption:document.querySelector('#workflowStoryCaption').textContent.trim()}))()"""))
    print("WORKFLOW",samples)
    assert samples[0]["label"]=="NEW INQUIRY" and samples[0]["tone"]=="incoming",samples
    assert any(s["label"]=="VERIFIED" and s["tone"]=="verified" for s in samples),samples
    assert any("/ 100" in s["label"] and s["tone"] in ("priority","review","nurture") for s in samples),samples
    for _ in range(80):
        if e("document.querySelector('#workflow').dataset.storyState")=="complete": break
        time.sleep(.05)
    final=e("""(()=>({label:document.querySelector('#workflowStoryPacket b').textContent.trim(),tone:document.querySelector('#workflowStoryPacket').dataset.tone,state:document.querySelector('#workflow').dataset.storyState,connectors:[...document.querySelectorAll('#workflow .workflow-story-connector')].map(x=>x.className)}))()""")
    print("WORKFLOW_FINAL",final)
    assert final["label"]=="SALES REVIEW" and final["tone"]=="ready" and final["state"]=="complete",final
    assert all("story-connector-complete" in x for x in final["connectors"]),final

    # Operations motion + pointer/focus interaction.
    ops=e("""(()=>({
      animate:document.querySelector('.ops-dashboard').classList.contains('ops-animate'),
      donut:getComputedStyle(document.querySelector('.ops-donut-segment')).animationName,
      bar:getComputedStyle(document.querySelector('.ops-trend-bar rect')).animationName,
      source:getComputedStyle(document.querySelector('.ops-quality-track i')).animationName,
      urgency:getComputedStyle(document.querySelector('.ops-urgency-bar>span')).animationName,
      statusHooks:document.querySelectorAll('[data-ops-filter="status"]').length,
      sourceHooks:document.querySelectorAll('[data-ops-filter="source"]').length,
      urgencyHooks:document.querySelectorAll('[data-ops-filter="urgency"]').length
    }))()""")
    print("OPS_MOTION",ops)
    assert ops["animate"] and ops["donut"]!="none" and ops["bar"]!="none" and ops["source"]!="none" and ops["urgency"]!="none",ops
    assert ops["statusHooks"]>1 and ops["sourceHooks"]>0 and ops["urgencyHooks"]>1,ops

    focus=e("""(()=>{
      const row=document.querySelector('.ops-legend-row[data-ops-filter="status"]');
      row.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
      const value=row.dataset.opsValue;
      const all=[...document.querySelectorAll('[data-ops-filter="status"]')];
      const out={value,focused:all.filter(x=>x.classList.contains('ops-infographic-focus')).length,dimmed:all.filter(x=>x.classList.contains('ops-infographic-dim')).length};
      row.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,relatedTarget:document.body}));
      out.cleared=[...document.querySelectorAll('.ops-infographic-focus,.ops-infographic-dim')].length;
      return out;
    })()""")
    print("OPS_INTERACTION",focus)
    assert focus["focused"]>=1 and focus["dimmed"]>=1 and focus["cleared"]==0,focus
    keyboard=e("""(()=>{
      const row=document.querySelector('.ops-quality-row[data-ops-filter="source"]');
      row.focus();
      return {active:document.activeElement===row,focused:document.querySelectorAll('.ops-infographic-focus').length,dimmed:document.querySelectorAll('.ops-infographic-dim').length};
    })()""")
    print("OPS_KEYBOARD",keyboard)
    assert keyboard["active"] and keyboard["focused"]>=1 and keyboard["dimmed"]>=1,keyboard

    # Scenario neutral state, direct scrubbing and keyboard.
    neutral=e("""(()=>({active:[...document.querySelectorAll('#reliability [data-incident-scene].active')].map(x=>x.dataset.incidentScene),text:document.querySelector('.neutral-scene')?.innerText||''}))()""")
    print("SCENARIO_NEUTRAL",neutral)
    assert neutral["active"]==["none"] and "Choose a scenario" in neutral["text"],neutral
    e("document.querySelector('[data-edge=\"timeout\"]').click()")
    time.sleep(3.1)
    e("document.querySelector('[data-incident-index=\"1\"]').click()")
    b1=e("""(()=>({beat:document.querySelector('#reliability').dataset.incidentBeat,failed:document.querySelector('.timeout-link').classList.contains('failed'),retry:document.querySelector('#incidentRetryPlan').classList.contains('visible'),boundary:document.querySelector('#incidentBoundary').classList.contains('visible'),selectorBg:getComputedStyle(document.querySelector('[data-edge="timeout"]')).backgroundColor}))()""")
    e("document.querySelector('[data-incident-index=\"2\"]').focus();document.querySelector('[data-incident-index=\"2\"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))")
    b3=e("""(()=>({beat:document.querySelector('#reliability').dataset.incidentBeat,retry:document.querySelector('#incidentRetryPlan').classList.contains('visible'),boundary:document.querySelector('#incidentBoundary').classList.contains('visible'),current:document.activeElement?.dataset?.incidentIndex||null}))()""")
    print("SCENARIO",b1,b3)
    assert b1["beat"]=="1" and b1["failed"] and not b1["retry"] and not b1["boundary"],b1
    assert b1["selectorBg"]=="rgb(50, 26, 27)",b1
    assert b3["beat"]=="3" and b3["retry"] and b3["boundary"] and b3["current"]=="3",b3

    # Architecture semantic colors.
    e("document.querySelector('#architectureReplay').click()")
    for _ in range(140):
        if e("document.querySelector('#architecture').dataset.storyState")=="complete": break
        time.sleep(.05)
    arch=e("""(()=>({
      state:document.querySelector('#architecture').dataset.storyState,
      main:document.querySelector('#architecturePayload').textContent.trim(),
      mainTone:document.querySelector('#architecturePayload').dataset.tone,
      rules:document.querySelector('#architectureRulesPayload').textContent.trim(),
      rulesTone:document.querySelector('#architectureRulesPayload').dataset.tone,
      crm:document.querySelector('#architectureCrmPayload').textContent.trim(),
      crmTone:document.querySelector('#architectureCrmPayload').dataset.tone,
      branch:document.querySelector('#architecture .architecture').classList.contains('arch-branch-active'),
      reconverged:document.querySelector('#architecture .architecture').classList.contains('arch-reconverged'),
      mainOpacity:getComputedStyle(document.querySelector('#architecturePayload')).opacity,
      rulesOpacity:getComputedStyle(document.querySelector('#architectureRulesPayload')).opacity,
      crmOpacity:getComputedStyle(document.querySelector('#architectureCrmPayload')).opacity,
      readyRect:(()=>{const r=document.querySelector('#architecturePayload').getBoundingClientRect();return{top:r.top,bottom:r.bottom}})(),
      nextRect:(()=>{const r=document.querySelector('#architecture [data-arch-node="next"]').getBoundingClientRect();return{top:r.top,bottom:r.bottom}})()
    }))()""")
    print("ARCH",arch)
    assert arch["state"]=="complete" and arch["main"]=="READY" and arch["mainTone"]=="ready",arch
    assert arch["rules"]=="SCORE" and arch["rulesTone"]=="score" and arch["crm"]=="CRM STATE" and arch["crmTone"]=="crm-state",arch
    assert arch["branch"] and arch["reconverged"],arch
    assert arch["mainOpacity"]=="1" and arch["rulesOpacity"]=="0" and arch["crmOpacity"]=="0",arch
    assert arch["readyRect"]["bottom"]<=arch["nextRect"]["top"]+1,arch

    # Run one workflow and open CRM, then inspect visible text for prototype wording.
    e("document.querySelector('[data-lead-preset=\"hot\"]').click();document.querySelector('#leadForm').requestSubmit()")
    for _ in range(150):
        if e("document.querySelector('#execStatus').textContent.trim()")=="COMPLETE": break
        time.sleep(.05)
    e("document.querySelector('#openCrmTop').click()")
    time.sleep(.2)
    copy=e("""(()=>{const t=document.body.innerText;const banned=['demo','demonstration','showcase','simulated','illustrative','interactive prototype'];return{hits:banned.filter(x=>t.toLowerCase().includes(x)),snippet:t.match(/.{0,35}(demo|demonstration|showcase|simulated|illustrative|interactive prototype).{0,55}/i)?.[0]||''}})()""")
    print("COPY",copy)
    assert not copy["hits"],copy

    # screenshots
    e("document.querySelector('#closeCrm').click();document.querySelector('#workflow').scrollIntoView({block:'center',behavior:'auto'})")
    time.sleep(.2)
    for name,sel in [("workflow","#workflow"),("workspace","#workspace"),("reliability","#reliability"),("architecture","#architecture")]:
        e(f"document.querySelector('{sel}').scrollIntoView({{block:'center',behavior:'auto'}})")
        time.sleep(.25)
        r=c("Page.captureScreenshot",{"format":"png","fromSurface":True})
        open(f"{OUT}/{name}-1440.png","wb").write(base64.b64decode(r["data"]))

    print("PROFESSIONAL_POLISH_RUNTIME=PASS")
finally:
    try: ws.close()
    except: pass
    proc.terminate()
    shutil.rmtree(profile,ignore_errors=True)

