import json,shutil,subprocess,tempfile,time,urllib.request,websocket
URL="http://127.0.0.1:8805/"
PORT=9650
profile=tempfile.mkdtemp(prefix="lf-v41-manual-")
err=open("/tmp/lf-v41-manual-chrome.log","w")
proc=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--remote-allow-origins=*",
 f"--remote-debugging-port={PORT}",f"--user-data-dir={profile}","about:blank"],stdout=subprocess.DEVNULL,stderr=err)
errors=[]
try:
  tab=None
  for _ in range(300):
    try:
      tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list"))
      pages=[x for x in tabs if x.get("type")=="page"]
      if pages:tab=pages[0];break
    except Exception:
      if proc.poll() is not None:break
      time.sleep(.05)
  assert tab,"Chrome page target unavailable"
  ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=20);seq=0
  def call(method,params=None):
    global seq
    seq+=1;i=seq;ws.send(json.dumps({"id":i,"method":method,"params":params or {}}))
    while True:
      m=json.loads(ws.recv())
      if m.get("method")=="Runtime.exceptionThrown":errors.append(m)
      if m.get("id")==i:
        if "error" in m:raise RuntimeError(m["error"])
        return m.get("result",{})
  def ev(expr):return call("Runtime.evaluate",{"expression":expr,"returnByValue":True})["result"].get("value")
  call("Runtime.enable");call("Page.enable")
  call("Emulation.setDeviceMetricsOverride",{"width":1440,"height":950,"deviceScaleFactor":1,"mobile":False})
  call("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-reduced-motion","value":"no-preference"}]})
  call("Page.navigate",{"url":URL})
  for _ in range(120):
    time.sleep(.05)
    if ev("document.readyState==='complete' && !!window.LeadFlowStorytelling"):break

  ev("document.documentElement.style.scrollBehavior='auto'")
  def center(selector):
    ev(f"document.querySelector({json.dumps(selector)}).scrollIntoView({{behavior:'auto',block:'center'}})")
    time.sleep(.08)
    return ev("scrollY")
  def wait_state(selector,want,timeout=10):
    start=time.time();s=""
    while time.time()-start<timeout:
      s=ev(f"document.querySelector({json.dumps(selector)}).dataset.storyState||''")
      if s==want:return s
      time.sleep(.04)
    raise AssertionError((selector,want,s))
  def replay(button,section):
    y=center(button)
    ev(f"document.querySelector({json.dumps(button)}).click()")
    wait_state(section,"playing",2)
    samples=[]
    start=time.time()
    while time.time()-start<12:
      samples.append(ev("scrollY"))
      state=ev(f"document.querySelector({json.dumps(section)}).dataset.storyState||''")
      if state=="complete":break
      time.sleep(.04)
    else:raise AssertionError((button,"did not complete"))
    drift=max([abs(v-y) for v in samples] or [0])
    assert drift<=1.0,(button,"viewport drift",drift)
    return round(drift,2)

  results={}
  results["workflow_drift"]=replay("#workflowReplay","#workflow")

  # Produce a real operations story context through the workflow.
  center("#demo")
  ev("document.querySelector('[data-lead-preset=hot]').click();document.querySelector('#leadForm').requestSubmit()")
  start=time.time()
  while time.time()-start<15:
    if ev("document.querySelector('#execStatus').textContent.trim()")=="COMPLETE":break
    time.sleep(.05)
  else:raise AssertionError("workflow did not complete")
  assert ev("document.querySelector('#opsStoryReplay').disabled")==False
  results["operations_drift"]=replay("#opsStoryReplay","#workspace")

  center("#reliability")
  rel=[]
  for scenario in ("duplicate","timeout","review"):
    y=ev("scrollY")
    ev(f"document.querySelector('[data-edge={scenario}]').click()")
    wait_state("#reliability","playing",2)
    wait_state("#reliability","complete",6)
    assert abs(ev("scrollY")-y)<=1.0,(scenario,"viewport drift")
    assert ev(f"document.querySelector('[data-edge={scenario}]').classList.contains('active')")==True
    assert ev("document.querySelector('#reliability').dataset.incidentBeat")=="3"
    rel.append(scenario)
  # Keyboard inspection must switch out of autoplay state without moving viewport.
  y=ev("scrollY")
  ev("document.querySelector('[data-incident-index=\"1\"]').focus()")
  ev("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))")
  time.sleep(.08)
  inspect=ev("""(()=>({state:document.querySelector('#reliability').dataset.storyState,beat:document.querySelector('#reliability').dataset.incidentBeat,current:document.querySelector('[aria-current=step]')?.dataset.incidentIndex||''}))()""")
  assert inspect["state"]=="inspecting" and inspect["beat"]=="2" and inspect["current"]=="2",inspect
  assert abs(ev("scrollY")-y)<=1.0,("keyboard inspection viewport drift",ev("scrollY")-y)
  results["reliability"]=rel
  results["keyboard_inspection"]=inspect

  results["architecture_drift"]=replay("#architectureReplay","#architecture")
  assert not errors,errors
  print("MANUAL_MOTION_CONTROLS=PASS",json.dumps(results,sort_keys=True))
finally:
  try:ws.close()
  except:pass
  proc.terminate()
  try:err.close()
  except:pass
  shutil.rmtree(profile,ignore_errors=True)
