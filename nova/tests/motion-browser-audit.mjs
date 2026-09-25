import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('nova-motion-audit',{recursive:true});
const browser=await chromium.launch({headless:true});
const report={generatedAt:new Date().toISOString(),desktop:{},mobile:{},errors:[]};

function stats(series){
  const vel=[]; for(let i=1;i<series.length;i++) vel.push(series[i]-series[i-1]);
  const acc=[]; for(let i=1;i<vel.length;i++) acc.push(vel[i]-vel[i-1]);
  const jerk=[];for(let i=1;i<acc.length;i++) jerk.push(acc[i]-acc[i-1]);
  const abs=a=>a.map(Math.abs);
  const max=(a)=>a.length?Math.max(...a):0;
  const idx=(a)=>a.reduce((b,v,i)=>Math.abs(v)>Math.abs(a[b]??-Infinity)?i:b,0);
  return {maxVel:max(abs(vel)),maxAcc:max(abs(acc)),maxJerk:max(abs(jerk)),jerkIndex:idx(jerk)};
}
function pointStats(frames){
  const cx=frames.map(f=>(f.points.cushion.x+f.points.headband.x+f.points.controls.x)/3);
  const cy=frames.map(f=>(f.points.cushion.y+f.points.headband.y+f.points.controls.y)/3);
  const span=frames.map(f=>Math.hypot(f.points.controls.x-f.points.cushion.x,f.points.controls.y-f.points.cushion.y));
  const crown=frames.map(f=>Math.hypot(f.points.headband.x-(f.points.cushion.x+f.points.controls.x)/2,f.points.headband.y-(f.points.cushion.y+f.points.controls.y)/2));
  const speed=[];for(let i=1;i<cx.length;i++)speed.push(Math.hypot(cx[i]-cx[i-1],cy[i]-cy[i-1]));
  const speedAcc=[];for(let i=1;i<speed.length;i++)speedAcc.push(speed[i]-speed[i-1]);
  return {centroidX:stats(cx),centroidY:stats(cy),earcupSpan:stats(span),crown:stats(crown),maxPixelStep:Math.max(0,...speed),maxPixelStepDelta:Math.max(0,...speedAcc.map(Math.abs))};
}
async function ready(viewport,label,mobile=false){
  const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(label+': pageerror '+e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(label+': console '+m.text());});
  page.on('requestfailed',r=>report.errors.push(label+': requestfailed '+r.url()+' '+(r.failure()?.errorText||'')));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>document.body.dataset.modelState==='ready',{timeout:25000});
  return {context,page};
}
async function setProgress(page,p,settle=700){
  await page.evaluate(progress=>{
    document.documentElement.style.scrollBehavior='auto';
    const behind=document.querySelector('#behind');
    const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
    scrollTo(0,max*progress);
  },p);
  await page.waitForFunction(progress=>{
    const behind=document.querySelector('#behind');
    const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
    return Math.abs(scrollY/max-progress)<.003;
  },p,{timeout:4000});
  if(settle) await page.waitForTimeout(settle);
}
async function collect(page,{frames=120,action=null}){
  return page.evaluate(async ({frames,action})=>{
    const read=()=>window.__NOVA_QA__?.productFrame?.();
    const rows=[];
    for(let i=0;i<frames;i++){
      if(action && i===action.frame){
        if(action.type==='click') document.querySelector(action.selector)?.click();
        if(action.type==='scroll'){
          const behind=document.querySelector('#behind');
          const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
          scrollTo(0,max*action.progress);
        }
      }
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const f=read();
      if(f?.points?.cushion&&f?.points?.headband&&f?.points?.controls){
        rows.push({i,range:document.body.dataset.range,progress:Number(document.body.dataset.rangeProgress||0),points:{cushion:f.points.cushion,headband:f.points.headband,controls:f.points.controls}});
      }
    }
    return rows;
  },{frames,action});
}
async function collectContinuousScroll(page,durationFrames=360){
  return page.evaluate(async frames=>{
    document.documentElement.style.scrollBehavior='auto';
    const behind=document.querySelector('#behind');
    const max=Math.max(1,behind.offsetTop+behind.offsetHeight-innerHeight);
    const out=[];
    for(let i=0;i<frames;i++){
      const p=i/(frames-1);
      scrollTo(0,max*p);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const f=window.__NOVA_QA__?.productFrame?.();
      if(f?.points?.cushion&&f?.points?.headband&&f?.points?.controls){
        out.push({i,p,range:document.body.dataset.range,points:{cushion:f.points.cushion,headband:f.points.headband,controls:f.points.controls}});
      }
    }
    return out;
  },durationFrames);
}
async function dragCanvas(page,dx,dy){
  const box=await page.locator('#webgl').boundingBox();
  if(!box) throw new Error('canvas bounds unavailable');
  const x=box.x+box.width*.5,y=box.y+box.height*.5;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:12});await page.mouse.up();
}
async function auditViewport(viewport,prefix,mobile=false){
  const {context,page}=await ready(viewport,prefix,mobile);
  const out={};

  await setProgress(page,.79,800);
  out.normalSide=pointStats(await collect(page,{frames:120,action:{frame:5,type:'click',selector:'[data-inspection-view="side"]'}}));
  await setProgress(page,.79,500);
  await page.locator('[data-inspection-view="front"]').click();await page.waitForTimeout(800);
  out.normalRear=pointStats(await collect(page,{frames:150,action:{frame:5,type:'click',selector:'[data-inspection-view="rear"]'}}));

  await setProgress(page,.79,500);
  await page.locator('[data-inspection-view="front"]').click();await page.waitForTimeout(800);
  await dragCanvas(page,280,70);await page.waitForTimeout(80);
  out.dragThenSide=pointStats(await collect(page,{frames:120,action:{frame:5,type:'click',selector:'[data-inspection-view="side"]'}}));

  await setProgress(page,.79,500);
  await page.locator('[data-inspection-view="front"]').click();await page.waitForTimeout(800);
  await dragCanvas(page,-260,-55);await page.waitForTimeout(80);
  out.dragThenReset=pointStats(await collect(page,{frames:120,action:{frame:5,type:'click',selector:'#inspectionReset'}}));

  await setProgress(page,.79,500);
  await page.locator('[data-inspection-view="rear"]').click();await page.waitForTimeout(1000);
  out.rearThenExit=pointStats(await collect(page,{frames:150,action:{frame:5,type:'scroll',progress:.87}}));

  await setProgress(page,.79,500);
  await page.locator('[data-inspection-view="front"]').click();await page.waitForTimeout(700);
  const rapid=await page.evaluate(async()=>{
    const sels=['[data-inspection-view="rear"]','[data-inspection-view="side"]','[data-inspection-view="front"]','[data-inspection-view="rear"]'];
    const out=[];
    for(let i=0;i<150;i++){
      if([5,12,19,26].includes(i)) document.querySelector(sels[[5,12,19,26].indexOf(i)])?.click();
      await new Promise(r=>requestAnimationFrame(r));
      const f=window.__NOVA_QA__?.productFrame?.();
      if(f?.points?.cushion&&f?.points?.headband&&f?.points?.controls) out.push({i,points:{cushion:f.points.cushion,headband:f.points.headband,controls:f.points.controls}});
    }
    return out;
  });
  out.rapidRetarget=pointStats(rapid);

  await setProgress(page,0,800);
  const journey=await collectContinuousScroll(page,mobile?420:360);
  out.continuousScroll=pointStats(journey);
  out.continuousScrollPeaks=(()=>{
    const cx=journey.map(f=>(f.points.cushion.x+f.points.headband.x+f.points.controls.x)/3);
    const cy=journey.map(f=>(f.points.cushion.y+f.points.headband.y+f.points.controls.y)/3);
    const speed=[];for(let i=1;i<cx.length;i++)speed.push(Math.hypot(cx[i]-cx[i-1],cy[i]-cy[i-1]));
    const acc=[];for(let i=1;i<speed.length;i++)acc.push(Math.abs(speed[i]-speed[i-1]));
    return [...acc.map((v,i)=>({v,p:journey[i+2]?.p,range:journey[i+2]?.range}))].sort((a,b)=>b.v-a.v).slice(0,16);
  })();

  await setProgress(page,.79,700); await page.locator('[data-inspection-view="rear"]').click(); await page.waitForTimeout(900); await page.screenshot({path:`nova-motion-audit/${prefix}_rear.png`});
  await context.close();
  return out;
}

report.desktop=await auditViewport({width:1440,height:1000},'desktop',false);
report.mobile=await auditViewport({width:390,height:844},'mobile',true);
fs.writeFileSync('nova-motion-audit/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await browser.close();
if(report.errors.length) process.exitCode=1;
