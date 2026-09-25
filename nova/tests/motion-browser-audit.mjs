import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('nova-motion-audit',{recursive:true});
const browser=await chromium.launch({headless:true});
const BASELINE='https://v3.nova-interactive-portfolio.pages.dev/';
const CANDIDATE='http://127.0.0.1:4173/';

function scalarStats(values,epsilon=.02){
  const vel=[]; for(let i=1;i<values.length;i++) vel.push(values[i]-values[i-1]);
  const acc=[]; for(let i=1;i<vel.length;i++) acc.push(vel[i]-vel[i-1]);
  const jerk=[];for(let i=1;i<acc.length;i++) jerk.push(acc[i]-acc[i-1]);
  let reversals=0,prev=0;
  for(const v of vel){ if(Math.abs(v)<epsilon) continue; const s=Math.sign(v); if(prev&&s!==prev) reversals++; prev=s; }
  const max=a=>a.length?Math.max(...a.map(Math.abs)):0;
  return {maxVel:max(vel),maxAcc:max(acc),maxJerk:max(jerk),reversals};
}
function trajectoryStats(frames){
  const cx=frames.map(f=>(f.points.cushion.x+f.points.headband.x+f.points.controls.x)/3);
  const cy=frames.map(f=>(f.points.cushion.y+f.points.headband.y+f.points.controls.y)/3);
  const span=frames.map(f=>Math.hypot(f.points.controls.x-f.points.cushion.x,f.points.controls.y-f.points.cushion.y));
  const crown=frames.map(f=>Math.hypot(
    f.points.headband.x-(f.points.cushion.x+f.points.controls.x)/2,
    f.points.headband.y-(f.points.cushion.y+f.points.controls.y)/2
  ));
  const speed=[];for(let i=1;i<cx.length;i++)speed.push(Math.hypot(cx[i]-cx[i-1],cy[i]-cy[i-1]));
  const speedDelta=[];for(let i=1;i<speed.length;i++)speedDelta.push(Math.abs(speed[i]-speed[i-1]));
  const peakFrames=[...speedDelta.map((v,i)=>({v,p:frames[i+2]?.p??null,range:frames[i+2]?.range??null,frame:i+2}))]
    .sort((a,b)=>b.v-a.v).slice(0,10);
  return {
    centroidX:scalarStats(cx,.05),
    centroidY:scalarStats(cy,.05),
    earcupSpan:scalarStats(span,.04),
    crown:scalarStats(crown,.04),
    maxPixelStep:Math.max(0,...speed),
    maxPixelStepDelta:Math.max(0,...speedDelta),
    peakFrames
  };
}
async function ready(url,viewport,mobile=false){
  const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror '+e.message));
  page.on('console',m=>{if(m.type()==='error') errors.push('console '+m.text());});
  page.on('requestfailed',r=>errors.push('requestfailed '+r.url()+' '+(r.failure()?.errorText||'')));
  await page.goto(url,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>document.body.dataset.modelState==='ready',{timeout:25000});
  return {context,page,errors};
}
async function setProgress(page,p,settle=420){
  await page.evaluate(progress=>{
    document.documentElement.style.scrollBehavior='auto';
    const behind=document.querySelector('#behind');
    const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
    scrollTo(0,max*progress);
  },p);
  await page.waitForFunction(progress=>{
    const behind=document.querySelector('#behind');
    const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
    return Math.abs(scrollY/max-progress)<.004;
  },p,{timeout:4000});
  if(settle) await page.waitForTimeout(settle);
}
async function dragCanvas(page,dx,dy){
  const box=await page.locator('#webgl').boundingBox();
  if(!box) throw new Error('canvas bounds unavailable');
  const x=box.x+box.width*.5,y=box.y+box.height*.5;
  await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+dx,y+dy,{steps:10}); await page.mouse.up();
}
async function collect(page,{frames=60,actions=[]}){
  return page.evaluate(async ({frames,actions})=>{
    const rows=[];
    const byFrame=new Map(actions.map(a=>[a.frame,a]));
    for(let i=0;i<frames;i++){
      const action=byFrame.get(i);
      if(action){
        if(action.type==='click') document.querySelector(action.selector)?.click();
        if(action.type==='scroll'){
          const behind=document.querySelector('#behind');
          const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
          scrollTo(0,max*action.progress);
        }
      }
      await new Promise(r=>requestAnimationFrame(r));
      const f=window.__NOVA_QA__?.productFrame?.();
      if(f?.points?.cushion&&f?.points?.headband&&f?.points?.controls){
        const behind=document.querySelector('#behind');
        const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
        rows.push({
          i,
          p:scrollY/max,
          range:document.body.dataset.range,
          points:{cushion:f.points.cushion,headband:f.points.headband,controls:f.points.controls}
        });
      }
    }
    return rows;
  },{frames,actions});
}
async function continuous(page,{frames=150,from=0,to=1}){
  return page.evaluate(async ({frames,from,to})=>{
    document.documentElement.style.scrollBehavior='auto';
    const behind=document.querySelector('#behind');
    const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
    const rows=[];
    for(let i=0;i<frames;i++){
      const p=from+(to-from)*(i/(frames-1));
      scrollTo(0,max*p);
      await new Promise(r=>requestAnimationFrame(r));
      const f=window.__NOVA_QA__?.productFrame?.();
      if(f?.points?.cushion&&f?.points?.headband&&f?.points?.controls){
        rows.push({i,p,range:document.body.dataset.range,points:{cushion:f.points.cushion,headband:f.points.headband,controls:f.points.controls}});
      }
    }
    return rows;
  },{frames,from,to});
}

async function auditDesktop(url,label){
  const {context,page,errors}=await ready(url,{width:1440,height:1000});
  const out={errors};
  console.log(label+': desktop inspection views');

  await setProgress(page,.79,600);
  out.side=trajectoryStats(await collect(page,{frames:60,actions:[{frame:4,type:'click',selector:'[data-inspection-view="side"]'}]}));

  await setProgress(page,.79,350); await page.locator('[data-inspection-view="front"]').click(); await page.waitForTimeout(650);
  out.rear=trajectoryStats(await collect(page,{frames:75,actions:[{frame:4,type:'click',selector:'[data-inspection-view="rear"]'}]}));

  await page.waitForTimeout(650);
  out.frontFromRear=trajectoryStats(await collect(page,{frames:75,actions:[{frame:4,type:'click',selector:'[data-inspection-view="front"]'}]}));

  await setProgress(page,.79,350); await page.locator('[data-inspection-view="front"]').click(); await page.waitForTimeout(600);
  await dragCanvas(page,280,70); await page.waitForTimeout(60);
  out.dragToSide=trajectoryStats(await collect(page,{frames:60,actions:[{frame:4,type:'click',selector:'[data-inspection-view="side"]'}]}));

  await setProgress(page,.79,350); await page.locator('[data-inspection-view="front"]').click(); await page.waitForTimeout(600);
  await dragCanvas(page,-260,-55); await page.waitForTimeout(60);
  out.dragReset=trajectoryStats(await collect(page,{frames:60,actions:[{frame:4,type:'click',selector:'#inspectionReset'}]}));

  await setProgress(page,.79,350); await page.locator('[data-inspection-view="rear"]').click(); await page.waitForTimeout(850);
  out.rearExit=trajectoryStats(await collect(page,{frames:70,actions:[{frame:4,type:'scroll',progress:.87}]}));

  await setProgress(page,.79,350); await page.locator('[data-inspection-view="front"]').click(); await page.waitForTimeout(600);
  out.rapidViews=trajectoryStats(await collect(page,{frames:80,actions:[
    {frame:4,type:'click',selector:'[data-inspection-view="rear"]'},
    {frame:11,type:'click',selector:'[data-inspection-view="side"]'},
    {frame:18,type:'click',selector:'[data-inspection-view="front"]'},
    {frame:25,type:'click',selector:'[data-inspection-view="rear"]'}
  ]}));

  console.log(label+': desktop fold controls');
  await setProgress(page,.65,500);
  out.foldRetarget=trajectoryStats(await collect(page,{frames:80,actions:[
    {frame:4,type:'click',selector:'[data-fold-state="fold"]'},
    {frame:25,type:'click',selector:'[data-fold-state="open"]'},
    {frame:46,type:'click',selector:'[data-fold-state="fold"]'}
  ]}));

  await setProgress(page,.65,500);
  out.foldExit=trajectoryStats(await collect(page,{frames:70,actions:[
    {frame:4,type:'click',selector:'[data-fold-state="fold"]'},
    {frame:30,type:'scroll',progress:.74}
  ]}));

  console.log(label+': desktop scroll trajectories');
  await setProgress(page,0,500);
  out.scrollForward=trajectoryStats(await continuous(page,{frames:160,from:0,to:1}));
  out.scrollReverse=trajectoryStats(await continuous(page,{frames:140,from:1,to:0}));

  await setProgress(page,.79,500); await page.locator('[data-inspection-view="rear"]').click(); await page.waitForTimeout(800);
  await page.screenshot({path:`nova-motion-audit/${label}_desktop_rear.png`});
  await context.close();
  return out;
}
async function auditMobile(url,label){
  const {context,page,errors}=await ready(url,{width:390,height:844},true);
  const out={errors};
  console.log(label+': mobile scroll trajectory');
  await setProgress(page,0,500);
  out.scrollForward=trajectoryStats(await continuous(page,{frames:150,from:0,to:1}));
  await setProgress(page,.79,450); await page.locator('[data-inspection-view="rear"]').tap(); await page.waitForTimeout(800);
  await page.screenshot({path:`nova-motion-audit/${label}_mobile_rear.png`});
  await context.close();
  return out;
}
function compare(a,b){
  const pairs={};
  for(const key of ['side','rear','frontFromRear','dragToSide','dragReset','rearExit','rapidViews','foldRetarget','foldExit','scrollForward','scrollReverse']){
    if(!a[key]||!b[key]) continue;
    pairs[key]={
      baselineStepDelta:a[key].maxPixelStepDelta,
      candidateStepDelta:b[key].maxPixelStepDelta,
      ratio:b[key].maxPixelStepDelta/Math.max(.0001,a[key].maxPixelStepDelta),
      baselineSpanReversals:a[key].earcupSpan.reversals,
      candidateSpanReversals:b[key].earcupSpan.reversals,
      baselineCrownReversals:a[key].crown.reversals,
      candidateCrownReversals:b[key].crown.reversals
    };
  }
  return pairs;
}

const phase=process.env.NOVA_MOTION_PHASE||'desktop';
let report;
let errors=[];
if(phase==='desktop'){
  const baseline=await auditDesktop(BASELINE,'baseline');
  const candidate=await auditDesktop(CANDIDATE,'candidate');
  report={phase,baselineUrl:BASELINE,candidateUrl:CANDIDATE,baseline,candidate,compare:compare(baseline,candidate)};
  errors=[...baseline.errors,...candidate.errors];
}else if(phase==='mobile'){
  const baseline=await auditMobile(BASELINE,'baseline');
  const candidate=await auditMobile(CANDIDATE,'candidate');
  report={phase,baselineUrl:BASELINE,candidateUrl:CANDIDATE,baseline,candidate,compare:compare(baseline,candidate)};
  errors=[...baseline.errors,...candidate.errors];
}else{
  throw new Error('Unknown NOVA_MOTION_PHASE '+phase);
}
fs.writeFileSync('nova-motion-audit/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await browser.close();
if(errors.length) throw new Error(errors.join('\n'));
