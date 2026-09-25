import json,shutil,subprocess,tempfile,time,urllib.request,websocket
URL="http://127.0.0.1:8805/v2/"
profile=tempfile.mkdtemp(prefix="lf-v2-audit-");port=9392
p=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--remote-allow-origins=*",f"--remote-debugging-port={port}",f"--user-data-dir={profile}","about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
errs=[]
try:
  for _ in range(100):
    try:
      tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"));t=next(x for x in tabs if x.get("type")=="page" and x.get("url")=="about:blank");break
    except:time.sleep(.05)
  ws=websocket.create_connection(t["webSocketDebuggerUrl"],timeout=10);seq=0
  def c(m,pa=None):
    global seq;seq+=1;i=seq;ws.send(json.dumps({"id":i,"method":m,"params":pa or {}}))
    while 1:
      x=json.loads(ws.recv())
      if x.get("method")=="Runtime.exceptionThrown":errs.append(x)
      if x.get("id")==i:
        if "error" in x:raise RuntimeError(x["error"])
        return x.get("result",{})
  def e(x):return c("Runtime.evaluate",{"expression":x,"returnByValue":True})["result"].get("value")
  c("Runtime.enable");c("Page.enable");c("Emulation.setDeviceMetricsOverride",{"width":1440,"height":950,"deviceScaleFactor":1,"mobile":False});c("Page.navigate",{"url":URL})
  for _ in range(120):
    ready=e("document.readyState==='complete'&&!!document.querySelector('.crm-analytics-v2')&&document.scripts.length>0")
    if ready:break
    time.sleep(.05)
  out=e("""(()=>({title:document.title,theme:document.documentElement.dataset.theme||'dark',progress:!!document.querySelector('#presentationProgressBar'),analytics:!!document.querySelector('.crm-analytics-v2'),toggle:document.querySelector('#themeToggleLabel')?.textContent,srcs:[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean),docW:document.documentElement.scrollWidth,viewport:innerWidth}))()""")
  e("document.querySelector('#openCrmTop').click();document.querySelector('[data-crm-view=\"analytics\"]').click()");time.sleep(.15)
  crm=e("""(()=>({hidden:document.querySelector('#crmModal').getAttribute('aria-hidden'),title:document.querySelector('#crmViewTitle').textContent.trim(),regions:['analyticsDistribution','analyticsScoreTrend','analyticsSourceQuality','analyticsUrgencyMix'].map(id=>!!document.querySelector('#'+id))}))()""")
  print("V2",out);print("CRM",crm);print("ERRORS",len(errs))
  assert out["progress"] and out["analytics"] and out["toggle"]=="Dark",out
  assert "./dashboard.js" in out["srcs"] and "./app.js" in out["srcs"],out
  assert out["docW"]<=out["viewport"],out
  assert crm["hidden"]=="false" and crm["title"]=="Pipeline Analytics" and all(crm["regions"]),crm
  assert not errs,errs
  print("V2_RUNTIME_AUDIT=PASS")
finally:
  try:ws.close()
  except:pass
  p.terminate();shutil.rmtree(profile,ignore_errors=True)

