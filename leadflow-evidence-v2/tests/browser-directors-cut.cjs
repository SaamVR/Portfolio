const puppeteer=require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const fs=require('node:fs');
const url=process.env.LEADFLOW_QA_URL || 'https://evidence-review.leadflow-evidence-v2.pages.dev/';
const output=process.env.LEADFLOW_QA_OUTPUT_DIR || '/tmp/leadflow-directors-cut-browser-qa';
fs.mkdirSync(output,{recursive:true});
const log=[];
function yes(ok,label){if(!ok)throw Error('FAILED: '+label);console.log('PASS '+label);log.push(label);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],timeout:60000});
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
 await page.setViewport({width:1440,height:950,deviceScaleFactor:1});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.querySelector('#api-status')?.textContent.includes('LIVE EDGE API'),{timeout:20000});
 yes((await page.$$('#film .film-station')).length===5,'five visually staged stations');
 yes((await page.$$('#film .film-chapters button')).length===5,'five chapter navigation buttons');
 yes(await page.$eval('#film-progress',e=>e.disabled)===true,'controls gated before server confirmation');
 const initial=await page.$eval('#film-stage',e=>e.dataset.state);
 yes(initial==='idle','poster waits for validated API');
 await page.click('#film-launch');
 await page.waitForFunction(()=>document.querySelector('#film-stage')?.dataset.state==='playing'||document.querySelector('#film-stage')?.dataset.state==='finished',{timeout:17000});
 const verification=await page.evaluate(()=>({
   receipt:document.querySelector('#film-receipt-label')?.textContent,
   posterHidden:document.querySelector('#film-poster')?.hidden,
   inputCount:document.querySelector('#local-count')?.textContent,
   title:document.querySelector('#film-title')?.textContent,
   enabled:!document.querySelector('#film-progress')?.disabled
 }));
 yes(verification.receipt.startsWith('SERVER RECEIPT /'),'story only after receipt');
 yes(verification.posterHidden,'poster removed after receipt');
 yes(verification.enabled,'player controls enabled after verified execution');
 await page.click('#film-pause');
 const before=Number(await page.$eval('#film-progress',e=>e.value));
 await sleep(420);
 const after=Number(await page.$eval('#film-progress',e=>e.value));
 yes(before===after,'pause freezes actual timeline');
 const seek=async(ms,name)=>{
  await page.$eval('#film-progress',(el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}))},ms);
  await sleep(180);
  const f=await page.evaluate(()=>({
    act:document.querySelector('#film-stage')?.dataset.act,
    title:document.querySelector('#film-title')?.textContent,
    score:document.querySelector('#film-score-number')?.textContent,
    route:document.querySelector('#film-route-progress')?.getAttribute('style'),
    approval:document.querySelector('#film-approval')?.style.opacity,
    fault:document.querySelector('#film-fault')?.dataset.active,
    filmT:document.querySelector('#film-progress')?.value
  }));
  yes(f.act===name,'chapter '+name+' renders at '+ms+'ms');
  await (await page.$('#film-stage')).screenshot({path:output+'/'+name+'.png'});
  return f;
 };
 const arrival=await seek(2550,'arrival');
 const verificationAct=await seek(6600,'verification');
 const decision=await seek(11700,'decision');
 yes(decision.score!=='00','confirmed server score counted during decision act');
 const handoff=await seek(16800,'handoff');
 yes(handoff.fault==='false','normal execution does not invent provider failure');
 const final=await seek(22600,'resolution');
 yes(Number(final.approval)>.9,'approval card appears after transfer');
 await page.click('#film-skip');
 yes(await page.$eval('#film-stage',e=>e.dataset.state)==='finished','skip goes to verified outcome');
 await page.click('#film-replay');
 await sleep(280);
 yes(await page.$eval('#film-stage',e=>e.dataset.state)==='playing','replay restarts full performance');
 await page.click('#film-pause');
 const sourceScoring=await page.$eval('#score-value',e=>e.textContent);
 yes(sourceScoring==='96/100','original functional API console remains intact');
 // Synthetic timeout branch: actor never displays an actual external CRM incident.
 await page.click('[data-scenario="timeout"]');
 await page.click('#run-button');
 await page.waitForFunction(()=>document.querySelector('#run-status')?.textContent==='COMPLETED',{timeout:15000});
 await page.click('#film-from-receipt');
 await page.waitForFunction(()=>document.querySelector('#film-stage')?.dataset.state==='playing',{timeout:12000});
 await page.click('#film-pause');
 await page.$eval('#film-progress',el=>{el.value='16700';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await sleep(200);
 yes(await page.$eval('#film-fault',e=>e.dataset.active)==='true','confirmed sandbox faults create the choreographed setback');
 yes((await page.$eval('#film-fault-label',e=>e.textContent)).includes('SIMULATED'),'fault is clearly disclosed');
 await (await page.$('#film-stage')).screenshot({path:output+'/handoff-fault.png'});
 // Motion-reduced: immediate final result and full transcript.
 const reduced=await browser.newPage();
 reduced.on('pageerror',e=>errors.push('REDUCED '+e.message));
 await reduced.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await reduced.setViewport({width:390,height:844,deviceScaleFactor:1});
 await reduced.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await reduced.waitForFunction(()=>document.querySelector('#api-status')?.textContent.includes('LIVE EDGE API'),{timeout:20000});
 await reduced.click('#film-run');
 await reduced.waitForFunction(()=>document.querySelector('#film-stage')?.dataset.state==='finished',{timeout:15000});
 yes(await reduced.$eval('#film-progress',e=>Number(e.value))===24400,'reduced-motion skips animation to verified final outcome');
 const sizes=await reduced.evaluate(()=>({width:innerWidth,body:document.body.scrollWidth,doc:document.documentElement.scrollWidth}));
 yes(sizes.body<=sizes.width&&sizes.doc<=sizes.width,'390px does not overflow horizontally');
 await (await reduced.$('#film-stage')).screenshot({path:output+'/mobile-reduced.png'});
 yes(errors.length===0,'no browser JavaScript errors: '+errors.slice(0,4).join(' | '));
 const result={verifiedAt:new Date().toISOString(),url,passed:log,errors,mobile:sizes,screenshots:fs.readdirSync(output).filter(x=>x.endsWith('.png'))};
 fs.writeFileSync(output+'/qa.json',JSON.stringify(result,null,2));
 console.log('DIRECTORS_CUT_QA_PASS '+JSON.stringify(result));
 await browser.close();
})().catch(e=>{console.error('DIRECTORS_CUT_QA_FAILURE',e.stack);process.exit(1)});
