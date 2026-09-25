import base64,json,os,shutil,subprocess,tempfile,time,urllib.request,websocket
URL="http://127.0.0.1:8805/"
OUT="/tmp/leadflow-v4-visual"
os.makedirs(OUT,exist_ok=True)

def capture(theme,width,height,port,label,scroll_y=0):
    profile=tempfile.mkdtemp(prefix="lf-v4-cap-")
    proc=subprocess.Popen([
        "/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu",
        "--remote-allow-origins=*",f"--remote-debugging-port={port}",
        f"--user-data-dir={profile}","about:blank"
    ],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    ws=None
    try:
        tab=None
        for _ in range(300):
            try:
                tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
                tab=next(x for x in tabs if x.get("type")=="page" and x.get("url")=="about:blank")
                break
            except Exception:
                time.sleep(.05)
        if not tab:
            raise RuntimeError("Chrome DevTools page did not start")
        ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=10)
        seq=0
        def call(method,params=None):
            nonlocal seq
            seq+=1
            ident=seq
            ws.send(json.dumps({"id":ident,"method":method,"params":params or {}}))
            while True:
                msg=json.loads(ws.recv())
                if msg.get("id")==ident:
                    if "error" in msg: raise RuntimeError(msg["error"])
                    return msg.get("result",{})
        call("Page.enable")
        call("Runtime.enable")
        call("Emulation.setDeviceMetricsOverride",{"width":width,"height":height,"deviceScaleFactor":1,"mobile":width<600})
        call("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-reduced-motion","value":"reduce"}]})
        call("Page.navigate",{"url":URL})
        time.sleep(.9)
        expr=f"""document.documentElement.dataset.theme='{theme}';
document.documentElement.style.scrollBehavior='auto';
document.querySelectorAll('.reveal-on-scroll').forEach(el=>el.classList.add('revealed'));
window.scrollTo(0,{scroll_y});"""
        call("Runtime.evaluate",{"expression":expr})
        time.sleep(.2)
        shot=call("Page.captureScreenshot",{"format":"png","captureBeyondViewport":False,"fromSurface":True})
        with open(os.path.join(OUT,f"{label}-{theme}-{width}.png"),"wb") as f:
            f.write(base64.b64decode(shot["data"]))
    finally:
        if ws:
            try: ws.close()
            except Exception: pass
        proc.terminate()
        try: proc.wait(timeout=3)
        except Exception: proc.kill()
        shutil.rmtree(profile,ignore_errors=True)

port=9800
for theme in ("dark","light"):
    capture(theme,1440,1000,port,"hero",0);port+=1
    capture(theme,1440,1000,port,"middle",3900);port+=1
    capture(theme,1440,1000,port,"ending",7600);port+=1
    capture(theme,390,844,port,"mobile-hero",0);port+=1
print("V4_VISUAL_CAPTURE=PASS")
