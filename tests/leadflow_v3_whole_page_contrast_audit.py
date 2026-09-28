import json,subprocess,tempfile,shutil,time,urllib.request,websocket
URL="http://127.0.0.1:8805/"
def run(theme,width,port):
    profile=tempfile.mkdtemp(prefix="lf-contrast-")
    p=subprocess.Popen(["/usr/bin/google-chrome","--headless","--no-sandbox","--disable-gpu","--remote-allow-origins=*",
        f"--remote-debugging-port={port}",f"--user-data-dir={profile}","about:blank"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
      for _ in range(120):
        try:
          tabs=json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"));tab=next(x for x in tabs if x.get("type")=="page" and x.get("url")=="about:blank");break
        except:time.sleep(.05)
      ws=websocket.create_connection(tab["webSocketDebuggerUrl"],timeout=10);i=0
      def c(m,pa=None):
        nonlocal i;i+=1;n=i;ws.send(json.dumps({"id":n,"method":m,"params":pa or {}}))
        while 1:
          x=json.loads(ws.recv())
          if x.get("id")==n:return x["result"]
      def e(x):return c("Runtime.evaluate",{"expression":x,"returnByValue":True})["result"].get("value")
      c("Page.enable");c("Emulation.setDeviceMetricsOverride",{"width":width,"height":900,"deviceScaleFactor":1,"mobile":width<600});c("Emulation.setEmulatedMedia",{"features":[{"name":"prefers-reduced-motion","value":"reduce"}]});c("Page.navigate",{"url":URL});time.sleep(1.0)
      e(f"document.documentElement.dataset.theme='{theme}';document.querySelectorAll('.reveal-on-scroll').forEach(el=>el.classList.add('revealed'))");time.sleep(.15)
      out=e(r"""(()=> {
        const parse=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
        const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
        const lum=c=>{const q=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*q(c.r)+.7152*q(c.g)+.0722*q(c.b)};
        const ratio=(a,b)=>{const A=lum(a),B=lum(b);return(Math.max(A,B)+.05)/(Math.min(A,B)+.05)};
        const hidden=el=>!!el.closest('[hidden],details:not([open]),[aria-hidden="true"],.crm-view:not(.active),.followup-modal:not(.open),.crm-modal:not(.open)');
        const opacity=el=>{let o=1;for(let n=el;n;n=n.parentElement){const v=parseFloat(getComputedStyle(n).opacity);o*=Number.isFinite(v)?v:1}return o};
        const visible=el=>{if(hidden(el))return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"&&opacity(el)>.02};
        const bgFor=el=>{const chain=[];for(let n=el;n;n=n.parentElement)chain.push(n);chain.reverse();let b=document.documentElement.dataset.theme==="light"?{r:245,g:248,b:246,a:1}:{r:11,g:17,b:16,a:1};for(const n of chain){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0)b=over(c,b)}return b};
        const texts=[...document.querySelectorAll('body *')].filter(el=>visible(el)&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
        const low=[];
        for(const el of texts){
          const s=getComputedStyle(el),fg0=parse(s.color);if(!fg0)continue;
          const bg=bgFor(el),fg=over({...fg0,a:fg0.a*opacity(el)},bg),cr=ratio(fg,bg),fs=parseFloat(s.fontSize),fw=parseInt(s.fontWeight)||400;
          const need=(fs>=24||(fs>=18.66&&fw>=700))?3:4.5;
          if(cr+0.02<need)low.push({text:el.textContent.trim().replace(/\s+/g,' ').slice(0,90),ratio:+cr.toFixed(2),need,size:+fs.toFixed(1),cls:String(el.className||'').slice(0,80)});
        }
        return{count:texts.length,low}
      })()""")
      print(theme,width,"texts",out["count"],"low",len(out["low"]))
      for x in out["low"][:25]:print("LOW",x)
      return out["low"]
    finally:
      try:ws.close()
      except:pass
      p.terminate();shutil.rmtree(profile,ignore_errors=True)
bad=[]
for j,(theme,width) in enumerate([("dark",1440),("light",1440),("dark",390),("light",390)]):
    low=run(theme,width,9490+j)
    bad.extend([(theme,width,x) for x in low])
if bad:raise AssertionError(str(bad[:30]))
print("WHOLE_PAGE_CONTRAST=PASS")
