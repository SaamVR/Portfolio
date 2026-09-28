import json,shutil,subprocess,tempfile,time,urllib.request,websocket,socket
URL="http://127.0.0.1:8812/"
profile=tempfile.mkdtemp(prefix="lf-creative-runtime-")
with socket.socket() as sock:
 sock.bind(("127.0.0.1",0))
 port=sock.getsockname()[1]
proc=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--remote-allow-origins=*",
 f"--remote-debugging-port={port}",f"--user-data-dir={profile}","about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
errs=[]
try:
 for _ in range(120):
  try:
   tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"));tab=next(x for x in tabs if x.get("type")=="page" and x.get("url")=="about:blank");break
  except:time.sleep(.05)
 ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=10);seq=0
 def c(m,p=None):
  global seq;seq+=1;i=seq;ws.send(json.dumps({"id":i,"method":m,"params":p or {}}))
  while True:
   x=json.loads(ws.recv())
   if x.get("method")=="Runtime.exceptionThrown":errs.append(x)
   if x.get("id")==i:
    if "error" in x:raise RuntimeError(x["error"])
    return x.get("result",{})
 def e(expr):return c("Runtime.evaluate",{"expression":expr,"returnByValue":True})["result"].get("value")
 c("Page.enable");c("Runtime.enable");c("Emulation.setDeviceMetricsOverride",{"width":1440,"height":950,"deviceScaleFactor":1,"mobile":False});c("Page.navigate",{"url":URL})
 ready=False
 for _ in range(80):
  time.sleep(.05)
  try:ready=bool(e("document.readyState==='complete' && !!window.LeadFlowStorytelling"))
  except Exception:ready=False
  if ready:break
 assert ready,"V3 runtime did not become ready"
 e("document.documentElement.style.scrollBehavior='auto';document.querySelector('#roi').scrollIntoView({block:'center',behavior:'auto'})");time.sleep(.8)
 initial=e("""(()=>({saved:document.querySelector('#hoursSaved').textContent.trim(),value:document.querySelector('#netMonthlyValue').textContent.trim(),post:document.querySelector('#postHours').textContent.trim(),bar:document.querySelector('#costBar').style.width}))()""")
 e("""(()=>{const el=document.querySelector('#calcAutomation');el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}))})()""")
 time.sleep(.12)
 during=e("""(()=>({pulse:document.querySelector('.calc-result').classList.contains('roi-updated'),animation:getComputedStyle(document.querySelector('.calc-result')).animationName,saved:document.querySelector('#hoursSaved').textContent.trim()}))()""")
 time.sleep(.55)
 final=e("""(()=>({saved:document.querySelector('#hoursSaved').textContent.trim(),value:document.querySelector('#netMonthlyValue').textContent.trim(),baseline:document.querySelector('#baselineHours').textContent.trim(),post:document.querySelector('#postHours').textContent.trim(),bar:document.querySelector('#costBar').style.width}))()""")
 print("ROI",initial,during,final)
 assert during["pulse"] and during["animation"]=="roiResultPulse",during
 assert final["saved"]=="25" and final["value"]=="$275" and final["baseline"]=="66.7h" and final["post"]=="41.7h",final
 assert 60<float(final["bar"].rstrip("%"))<65,final

 e("document.querySelector('#blueprint').scrollIntoView({block:'center',behavior:'auto'})");time.sleep(.5)
 collapsed=e("""(()=>{const d=document.querySelector('.blueprint-disclosure'),s=d.querySelector('summary');return{open:d.open,flow:[...document.querySelectorAll('.blueprint-summary-flow span')].map(x=>x.textContent.trim()),h:s.getBoundingClientRect().height}})()""")
 print("BLUEPRINT_COLLAPSED",collapsed)
 assert not collapsed["open"] and collapsed["flow"]==["Trigger","Rules","Action"] and collapsed["h"]>=44,collapsed
 e("document.querySelector('.blueprint-disclosure summary').click()");time.sleep(.35)
 expanded=e("""(()=>({open:document.querySelector('.blueprint-disclosure').open,nodes:document.querySelectorAll('#blueprintFlow .bp-node').length,textarea:!!document.querySelector('#processText'),buttonH:document.querySelector('#generateBlueprint').getBoundingClientRect().height}))()""")
 print("BLUEPRINT_EXPANDED",expanded)
 assert expanded["open"] and expanded["nodes"]>=5 and expanded["textarea"] and expanded["buttonH"]>=44,expanded

 e("document.querySelector('#reliability').scrollIntoView({block:'center',behavior:'auto'})");time.sleep(.25)
 reliability=e("""(()=>{const buttons=[...document.querySelectorAll('.reliability-actions [data-edge]')];const duplicate=buttons.find(x=>x.dataset.edge==='duplicate'),timeout=buttons.find(x=>x.dataset.edge==='timeout');return{active:buttons.filter(x=>x.classList.contains('active')).map(x=>x.dataset.edge),scene:[...document.querySelectorAll('[data-incident-scene].active')].map(x=>x.dataset.incidentScene),duplicateBg:getComputedStyle(duplicate).backgroundColor,timeoutBg:getComputedStyle(timeout).backgroundColor}})()""")
 print("RELIABILITY_NEUTRAL",reliability)
 assert reliability["active"]==[] and reliability["scene"]==["none"],reliability
 assert reliability["duplicateBg"]==reliability["timeoutBg"],reliability

 e("document.querySelector('#architecture').scrollIntoView({block:'center',behavior:'auto'});document.querySelector('#architectureReplay').click()")
 hit=False
 for _ in range(120):
  caption=e("document.querySelector('#architectureStoryCaption').textContent.trim()")
  if caption in ("Score intent + budget + urgency","Persist browser-local state"):
   hit=True;break
  time.sleep(.05)
 assert hit,caption
 arch=e("""(()=>{const rr=document.querySelector('#architectureRulesPayload').getBoundingClientRect(),cr=document.querySelector('#architectureCrmPayload').getBoundingClientRect(),rb=document.querySelector('[data-arch-node="rules"] b').getBoundingClientRect(),cb=document.querySelector('[data-arch-node="crm"] b').getBoundingClientRect();const overlap=(a,b)=>!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);return{caption:document.querySelector('#architectureStoryCaption').textContent.trim(),rulesOverlap:overlap(rr,rb),crmOverlap:overlap(cr,cb),docW:document.documentElement.scrollWidth,viewport:innerWidth}})()""")
 print("ARCH_BRANCH_GEOMETRY",arch)
 assert not arch["rulesOverlap"] and not arch["crmOverlap"],arch
 assert arch["docW"]<=arch["viewport"],arch

 assert not errs,errs
 print("CREATIVE_SECTIONS_RUNTIME=PASS")
finally:
 try:ws.close()
 except:pass
 proc.terminate();shutil.rmtree(profile,ignore_errors=True)

