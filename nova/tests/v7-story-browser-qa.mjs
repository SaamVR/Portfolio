import { chromium } from 'playwright';
import fs from 'node:fs';

const BASELINE=process.env.NOVA_BASELINE_URL || 'https://v4.nova-interactive-portfolio.pages.dev/';
const CANDIDATE=process.env.NOVA_CANDIDATE_URL || 'http://127.0.0.1:4173/';
const OUT=process.env.NOVA_V7_QA_OUT || 'nova-v7-story-qa';
fs.mkdirSync(OUT,{recursive:true});

const browser=await chromium.launch({headless:true});
const errors=[];
const report={baseline:BASELINE,candidate:CANDIDATE,viewports:{}};

async function open(url,viewport,mobile=false,label='page'){
  const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(label+' pageerror '+e.message));
  page.on('console',m=>{if(m.type()==='error') errors.push(label+' console '+m.text());});
  page.on('requestfailed',r=>errors.push(label+' requestfailed '+r.url()+' '+(r.failure()?.errorText||'')));
  await page.goto(url,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>document.body.dataset.modelState==='ready',{timeout:25000});
  return {context,page};
}

async function gotoProgress(page,p){
  await page.evaluate(progress=>{
    document.documentElement.style.scrollBehavior='auto';
    const qa=window.__NOVA_QA__;
    const target=qa?.scrollForProgress ? qa.scrollForProgress(progress) : (()=>{
      const behind=document.querySelector('#behind');
      const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
      return max*progress;
    })();
    scrollTo(0,target);
  },p);
  await page.waitForFunction(progress=>{
    const qa=window.__NOVA_QA__;
    const current=qa?.currentProgress ? qa.currentProgress() : (()=>{
      const behind=document.querySelector('#behind');
      const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
      return scrollY/max;
    })();
    return Math.abs(current-progress)<.006;
  },p,{timeout:5000});
  await page.waitForTimeout(620);
}

async function readState(page){
  return page.evaluate(()=>({
    range:document.body.dataset.range,
    active:document.querySelector('.stage.is-active')?.dataset.rangeAnchor || null,
    detail:document.body.dataset.designDetail || null,
    progress:window.__NOVA_QA__?.currentProgress?.() ?? null,
    visual:window.__NOVA_QA__?.visualState?.() ?? null,
    frame:window.__NOVA_QA__?.productFrame?.() ?? null
  }));
}

function assert(condition,message){
  if(!condition) throw new Error(message);
}

async function auditCandidate(viewport,mobile=false,label='desktop'){
  const {context,page}=await open(CANDIDATE,viewport,mobile,'candidate '+label);
  const points=[
    [.02,'hero'],[.08,'hero'],
    [.16,'design'],[.205,'design'],[.255,'design'],
    [.34,'spatial'],[.41,'spatial'],
    [.52,'adaptive'],
    [.62,'form'],[.675,'form'],[.69,'form'],[.72,'form'],
    [.79,'inspect'],[.90,'resolution'],[.985,'behind']
  ];
  const states=[];
  for(const [p,range] of points){
    await gotoProgress(page,p);
    const state=await readState(page);
    assert(state.range===range, label+' range mismatch at '+p+': '+state.range+' vs '+range);
    assert(state.active===range, label+' active chapter mismatch at '+p+': '+state.active+' vs '+range);
    if(range!=='behind' && state.frame){
      const intentionalCrop=range==='design';
      const visible=intentionalCrop ? state.frame.nearViewport>=3 && state.frame.inViewport>=2 : state.frame.inViewport>=3;
      assert(visible,label+' product framing invalid at '+p+' '+JSON.stringify(state.frame));
      assert(state.frame.earcupsInViewport>=1,label+' earcups left viewport at '+p);
    }
    states.push({p,range,detail:state.detail,pose:state.visual?.product?.pose??null,frame:state.frame});
    if([.08,.16,.205,.255,.41,.675,.69,.79,.90].includes(p)){
      await page.screenshot({path:OUT+'/'+label+'_'+String(p).replace('.','_')+'.png'});
    }
  }

  const byP=new Map(states.map(s=>[s.p,s]));
  assert(byP.get(.16)?.detail==='cushion',label+' Design cushion beat missing');
  assert(byP.get(.205)?.detail==='hinge',label+' Design hinge beat missing');
  assert(byP.get(.255)?.detail==='controls',label+' Design controls beat missing');

  const open=byP.get(.62)?.pose, folded=byP.get(.675)?.pose, hold=byP.get(.69)?.pose, reopened=byP.get(.72)?.pose;
  assert(Number.isFinite(open)&&Number.isFinite(folded)&&open-folded>.15,label+' fold action too weak: '+JSON.stringify({open,folded}));
  assert(Math.abs(hold-folded)<.02,label+' folded plateau missing: '+JSON.stringify({folded,hold}));
  assert(reopened-hold>.15,label+' reopen action missing: '+JSON.stringify({hold,reopened}));

  await gotoProgress(page,.79);
  await page.locator('[data-inspection-view="side"]').click();
  await page.waitForTimeout(700);
  const side=await readState(page);
  await page.locator('[data-inspection-view="rear"]').click();
  await page.waitForTimeout(850);
  const rear=await readState(page);
  assert(side.visual?.interaction?.inspectionView==='side',label+' side inspection ownership failed');
  assert(rear.visual?.interaction?.inspectionView==='rear',label+' rear inspection ownership failed');
  if(rear.frame){
    assert(rear.frame.earcupsInViewport>=2,label+' rear inspection loses an earcup');
  }
  await page.screenshot({path:OUT+'/'+label+'_inspection_rear.png'});

  // Reverse-scroll continuity check: every authored chapter must recover without
  // losing model readiness or narrative ownership.
  for(const p of [.90,.79,.69,.54,.41,.255,.16,.08,.02]){
    await gotoProgress(page,p);
    const state=await readState(page);
    assert(document!==null,label+' unreachable');
    assert(state.range,label+' reverse scroll lost range at '+p);
  }

  const metrics=await page.evaluate(()=>window.__NOVA_QA__?.storyMetrics?.()||null);
  assert(metrics?.segments?.length===8,label+' scroll director did not expose eight narrative chapters');
  for(let i=1;i<metrics.segments.length;i++){
    assert(metrics.segments[i].scrollStart>=metrics.segments[i-1].scrollStart,label+' chapter scroll anchors are not monotonic');
  }

  await context.close();
  return {states,side:{range:side.range,view:side.visual?.interaction?.inspectionView},rear:{range:rear.range,view:rear.visual?.interaction?.inspectionView},metrics};
}

async function baselineContactSheet(){
  const {context,page}=await open(BASELINE,{width:1440,height:1000},false,'baseline');
  for(const p of [.08,.16,.205,.255,.41,.675,.79,.90]){
    await gotoProgress(page,p);
    await page.screenshot({path:OUT+'/baseline_v4_'+String(p).replace('.','_')+'.png'});
  }
  const basics=await page.evaluate(()=>({
    release:document.body.dataset.release,
    title:document.title,
    model:document.body.dataset.modelState
  }));
  await context.close();
  return basics;
}

report.baselineState=await baselineContactSheet();
report.viewports.desktop=await auditCandidate({width:1440,height:1000},false,'desktop');
report.viewports.tablet=await auditCandidate({width:1024,height:768},false,'tablet');
report.viewports.mobile=await auditCandidate({width:390,height:844},true,'mobile');

fs.writeFileSync(OUT+'/report.json',JSON.stringify({report,errors},null,2));
await browser.close();
if(errors.length) throw new Error(errors.join('\n'));
console.log('v7_story_browser_qa: PASS');
