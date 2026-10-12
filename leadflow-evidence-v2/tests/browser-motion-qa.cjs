const puppeteer = require(process.env.PUPPETEER_MODULE || "puppeteer-core");
const fs = require("node:fs");
const base = process.env.LEADFLOW_QA_URL || "https://evidence-review.leadflow-evidence-v2.pages.dev/";
const out = process.env.LEADFLOW_QA_OUTPUT_DIR || "/tmp/leadflow-v2-browser-qa";
fs.mkdirSync(out,{recursive:true});
const assert = (v, name) => { if (!v) throw Error(name); console.log("PASS "+name); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const timeout = 14000;
const wait = (page, expr, ms=timeout) => page.waitForFunction(expr,{timeout:ms});
(async()=>{
  const browser = await puppeteer.launch({
    executablePath:process.env.CHROMIUM_PATH || "/snap/bin/chromium",headless:true,
    args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run"],
    timeout:60000
  });
  let requests = 0;
  const errors = [];
  const page = await browser.newPage();
  page.on("pageerror", e => errors.push("DESKTOP "+e.message));
  page.on("console", m => {if(m.type()==="error")errors.push("CONSOLE "+m.text())});
  await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
  await page.goto(base, {waitUntil:"domcontentloaded",timeout:40000});
  await wait(page, () => document.querySelector("#api-status")?.textContent.includes("LIVE EDGE API"));
  assert(await page.$eval("html", e => e.dataset.motion) === "on", "default animation enabled");
  assert(await page.$$eval(".flow-node[data-stage-index]", els => els.length) === 4, "four interactive hero stages");
  await page.click('[data-stage-index="2"]');
  assert((await page.$eval("#stage-description",e=>e.textContent)).includes("external writes remain disabled"), "interactive stage inspector explains sandbox boundary");
  await page.click("#replay-stages");
  await sleep(2750);
  assert(await page.$eval("#run-status",e=>e.textContent)==="NOT STARTED", "visual stage exploration does not fabricate server success");
  const rect=await page.$eval(".hero-visual",e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
  await page.mouse.move(rect.x + rect.w*.82,rect.y + rect.h*.2);
  await sleep(90);
  assert(await page.$eval(".hero-visual",e=>e.style.getPropertyValue("--scene-x")!=="0deg"), "pointer-responsive parallax updates transform safely");
  await page.mouse.move(10,100);
  assert(await page.$eval(".hero-visual",e=>e.style.getPropertyValue("--scene-x"))==="0deg", "pointer exit returns hero motion to neutral");
  await page.setRequestInterception(true);
  page.on("request",request=>{
    if(request.url().includes("/api/execute")&&request.method()==="POST"){
      requests++;
      setTimeout(()=>{if(!request.isInterceptResolutionHandled())request.continue().catch(()=>{})},650);
    } else request.continue().catch(()=>{});
  });
  await page.click("#run-button");
  await wait(page,()=>document.querySelector("#run-status")?.textContent==="EXECUTING");
  assert(await page.$$eval(".phase-done",els=>els.length)===0,"no completed motion before server responds");
  assert(await page.$eval("#execution-map-label",e=>e.textContent)==="REQUEST IN FLIGHT","in-flight motion labeled accurately");
  await wait(page,()=>document.querySelector("#run-status")?.textContent==="COMPLETED");
  assert(await page.$eval("#score-value",e=>e.textContent)==="96/100","confirmed score retained");
  assert(await page.$$eval(".score-factor",els=>els.length)>=4,"score-factor bars are data-derived");
  assert(await page.$eval("#score-factors",e=>e.hidden)===false,"explainable score visible only after confirmation");
  await wait(page,()=>document.querySelectorAll(".execution-phase.phase-done").length===4,7000);
  await wait(page,()=>document.querySelector("#execution-map-label")?.textContent==="SERVER TRACE COMPLETE",5000);
  assert(await page.$eval("#execution-map-label",e=>e.textContent)==="SERVER TRACE COMPLETE","all motion stages resolve after real server receipt");
  assert(requests===1,"one API request per explicit execution");
  assert((await page.$eval("#trace-list",e=>e.textContent)).includes("workflow.completed"),"actual backend trace rendered");
  await page.click("#replay-visual-button");
  await sleep(1350);
  assert(requests===1,"visual trace replay does not reexecute backend");
  assert(await page.$$eval(".execution-phase.phase-done",els=>els.length)===4,"manual visual replay completes");
  await page.addStyleTag({content:".site-header{position:static!important}"});
  await (await page.$("#lab")).screenshot({path:out+"/motion-02-verified-workflow.png"});
  await page.click('[data-scenario="timeout"]');
  assert(await page.$eval("#score-factors",e=>e.hidden)===true,"scenario change hides old scoring factors");
  assert(await page.$eval("#download-button",e=>e.disabled),"scenario change prevents stale receipt export");
  await page.click("#run-button");
  await wait(page,()=>document.querySelector("#run-status")?.textContent==="COMPLETED");
  await wait(page,()=>document.querySelectorAll(".execution-phase.phase-done").length===4,8000);
  assert((await page.$eval("#trace-list",e=>e.textContent)).match(/crm.sandbox.timeout/g)?.length===2,"simulated timeout emits exactly two fault events");
  assert(await page.$eval("#execution-signal-text",e=>e.textContent.toLowerCase().includes("simulated recovery")),"simulated failure clearly identified");
  await (await page.$("#lab")).screenshot({path:out+"/motion-03-fault-recovery.png"});
  const offPage = await browser.newPage();
  await offPage.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
  offPage.on("pageerror",e=>errors.push("REDUCED "+e.message));
  await offPage.setViewport({width:390,height:844,deviceScaleFactor:1});
  await offPage.goto(base,{waitUntil:"domcontentloaded",timeout:40000});
  await wait(offPage,()=>document.querySelector("#api-status")?.textContent.includes("LIVE EDGE API"));
  assert(await offPage.$eval("html",e=>e.dataset.motion)==="off","OS reduced-motion preference respected");
  assert(await offPage.$eval(".section-heading",e=>getComputedStyle(e).opacity)==="1","reduced-motion content remains visible");
  await offPage.click('[data-scenario="review"]');
  await offPage.click("#run-button");
  await wait(offPage,()=>document.querySelector("#run-status")?.textContent==="COMPLETED");
  assert(await offPage.$eval("#score-value",e=>e.textContent)==="60/100","reduced-motion workflow still works");
  assert(await offPage.$$eval(".execution-phase.phase-done",els=>els.length)===4,"reduced-motion stages skip animation but resolve");
  const widths=await offPage.evaluate(()=>({inner:innerWidth,body:document.body.scrollWidth,document:document.documentElement.scrollWidth}));
  assert(widths.body<=widths.inner && widths.document<=widths.inner,"390px reduced-motion no horizontal overflow");
  const motionPage=await browser.newPage();
  await motionPage.setViewport({width:390,height:844,deviceScaleFactor:1});
  await motionPage.goto(base,{waitUntil:"domcontentloaded",timeout:40000});
  await wait(motionPage,()=>document.querySelector("#api-status")?.textContent.includes("LIVE EDGE API"));
  assert(await motionPage.$eval("html",e=>e.dataset.motion)==="on","mobile motion enabled by default when allowed");
  await motionPage.click("#motion-toggle");
  assert(await motionPage.$eval("html",e=>e.dataset.motion)==="off","manual motion toggle OFF");
  await motionPage.click("#motion-toggle");
  assert(await motionPage.$eval("html",e=>e.dataset.motion)==="on","manual motion toggle ON");
  const mobileWidths=await motionPage.evaluate(()=>({inner:innerWidth,body:document.body.scrollWidth,document:document.documentElement.scrollWidth}));
  assert(mobileWidths.document<=mobileWidths.inner,"390px full-motion no horizontal overflow");
  const failedPage=await browser.newPage();
  failedPage.on("pageerror",e=>errors.push("ERROR_PATH "+e.message));
  await failedPage.setRequestInterception(true);
  failedPage.on("request",request=>{
    if(request.url().includes("/api/execute")&&request.method()==="POST")request.abort("failed").catch(()=>{});
    else request.continue().catch(()=>{});
  });
  await failedPage.goto(base,{waitUntil:"domcontentloaded",timeout:40000});
  await failedPage.click("#run-button");
  await wait(failedPage,()=>document.querySelector("#run-status")?.textContent==="FAILED");
  assert(await failedPage.$$eval(".execution-phase.phase-done",els=>els.length)===0,"failed API never shows successful phase");
  assert(await failedPage.$eval("#download-button",e=>e.disabled),"failed API has no downloadable success receipt");
  assert(await failedPage.$eval("#execution-signal-text",e=>e.textContent.includes("API request failed")),"failed API shows transparent error");
  assert(errors.length===0,"no uncaught JavaScript errors "+errors.join(" | "));
  const result={
    date:new Date().toISOString(),url:base,verifiedVersion:"cead360",
    checks:[
      "stage inspection","stage exploration not server success","desktop parallax returns to neutral",
      "no success before server response","API-derived score factors","verified execution choreography",
      "visual replay without new API request","fault-injection trace and labels",
      "reduced-motion support","mobile motion toggle","390px overflow","error path has no false success"
    ],
    widths,mobileWidths,errors,requests,
    screenshots:["motion-02-verified-workflow.png","motion-03-fault-recovery.png"]
  };
  fs.writeFileSync(out+"/motion-browser-qa.json",JSON.stringify(result,null,2));
  console.log("MOTION_QA_PASS",JSON.stringify(result));
  await browser.close();
})().catch(error=>{console.error("MOTION_QA_FAIL",error.stack);process.exit(1)});
