import {chromium} from 'playwright';
import fs from 'node:fs';

const out='nova-v5-qa';
fs.mkdirSync(out,{recursive:true});
const url=process.env.NOVA_URL||'http://127.0.0.1:4173/';
const report={url,checks:[],frames:[],errors:[]};
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const check=(name,pass,details)=>{report.checks.push({name,pass:Boolean(pass),details});};
async function ready(width,height,options={}){
  const context=await browser.newContext({viewport:{width,height},...options});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.dataset.modelState==='ready');
  return {context,page};
}
async function go(page,p){
  await page.evaluate(p=>{
    document.documentElement.style.scrollBehavior='auto';
    const e=document.querySelector('#behind');
    scrollTo({top:(e.offsetTop+e.offsetHeight-innerHeight)*p,behavior:'instant'});
  },p);
  await page.waitForTimeout(1600);
}
async function frame(page,label,p,shot=true){
  await go(page,p);
  const result=await page.evaluate(()=>{
    const active=document.querySelector('.stage.is-active .stage-inner');
    const children=active?[...active.children].filter(el=>getComputedStyle(el).display!=='none'):[];
    const rects=children.map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
    const copy=rects.length?{left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))}:null;
    return {range:document.body.dataset.range,model:window.__NOVA_QA__.productBounds(),copy,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  report.frames.push({label,p,...result});
  const {model:m,copy:c,width:w,height:h}=result;
  check(label+' '+result.range+' viewport',!result.overflow && c?.left>=-1 && c?.right<=w+1 && c?.top>=62 && c?.bottom<=h-45,result);
  check(label+' '+result.range+' product bounds',m&&m.left>=-8&&m.right<=w+8&&m.top>=45&&m.bottom<=h-50,m);
  const overlap=m&&c&&Math.min(m.right,c.right)-Math.max(m.left,c.left)>8&&Math.min(m.bottom,c.bottom)-Math.max(m.top,c.top)>8;
  check(label+' '+result.range+' product / copy separation',!overlap,{model:m,copy:c});
  if(shot)await page.screenshot({path:`${out}/${label}-${result.range}.png`});
}
try{
  // Capture the actual model, with a transparent background, for non-WebGL use.
  if(!process.env.NOVA_URL){
    fs.mkdirSync('nova/site/media',{recursive:true});
    const {context,page}=await ready(1440,1000,{deviceScaleFactor:2});
    await go(page,.02);
    const b=await page.evaluate(()=>window.__NOVA_QA__.productBounds());
    await page.addStyleTag({content:'body{background:transparent!important}body::before{display:none!important}body>*:not(#webgl){visibility:hidden!important}#webgl{opacity:1!important;visibility:visible!important}'});
    const x=Math.max(0,Math.floor(b.left)-20),y=Math.max(0,Math.floor(b.top)-20);
    await page.screenshot({path:'nova/site/media/nova-product.png',omitBackground:true,clip:{x,y,width:Math.ceil(b.right-x)+20,height:Math.ceil(b.bottom-y)+20}});
    await context.close();
  }
  for(const [label,w,h,points] of [
    ['desktop',1440,1000,[.02,.16,.36,.52,.65,.79,.90]],
    ['mobile',390,844,[.02,.16,.36,.52,.65,.79,.90]],
    ['small',360,740,[.02,.16,.36,.79,.90]],
    ['large-phone',430,932,[.16,.36,.79,.90]],
    ['tablet',1024,768,[.16,.36,.52,.65,.79,.90]],
    ['laptop',1440,800,[.16,.36,.52,.79,.90]]
  ]){
    const {context,page}=await ready(w,h,w<701?{hasTouch:true,isMobile:true}:{});
    for(const p of points) await frame(page,label,p);
    if(label==='desktop'){
      await go(page,.79);
      await page.locator('[data-inspection-view="rear"]').click();
      const motion=await page.evaluate(async()=>{
        const frames=[];
        for(let i=0;i<80;i++){await new Promise(requestAnimationFrame);frames.push(window.__NOVA_QA__.inspection().modelYaw);}
        return frames;
      });
      check('rear view settles continuously',motion.every(Number.isFinite)&&motion.every((v,i)=>i===0||v>=motion[i-1]-.002)&&Math.abs(motion.at(-1)-Math.PI)<.03,{start:motion[0],end:motion.at(-1)});
      await page.screenshot({path:`${out}/desktop-rear.png`});
      await page.locator('[data-inspection-view="side"]').click();
      await page.waitForTimeout(1200);
      await page.screenshot({path:`${out}/desktop-side.png`});
      await page.locator('#inspectionReset').click();
      await page.waitForTimeout(1400);
      check('reset returns to front',await page.evaluate(()=>Math.abs(window.__NOVA_QA__.inspection().modelYaw)<.01));
      await page.mouse.move(980,340);await page.mouse.down();await page.mouse.move(1100,375,{steps:12});await page.mouse.up();
      check('drag responds',await page.evaluate(()=>Math.abs(window.__NOVA_QA__.inspection().yaw)>.01));
      await page.locator('#inspectionReset').click();
      await go(page,.65);
      await page.locator('[data-fold-state="fold"]').click();await page.waitForTimeout(1600);
      await page.screenshot({path:`${out}/desktop-folded.png`});
      check('fold pressed',await page.locator('[data-fold-state="fold"]').getAttribute('aria-pressed')==='true');
      await page.locator('[data-fold-state="open"]').click();
      await go(page,.90);
      await page.locator('#productFactsTrigger').click();
      check('specs source disclosed',await page.locator('#productFactsPanel').innerText().then(s=>s.includes('Sony WH-1000XM6')));
      await page.keyboard.press('Shift+Tab');
      check('dialog focus contained',await page.evaluate(()=>document.querySelector('#productFactsPanel').contains(document.activeElement)));
      await page.keyboard.press('Escape');
      check('dialog focus restored',await page.evaluate(()=>document.activeElement?.id==='productFactsTrigger'&&!document.querySelector('main').inert));
      await go(page,0);
      await page.locator('#guidedTourStart').click();
      await page.waitForTimeout(1200);
      await page.locator('[data-tour-next]').click();await page.waitForTimeout(1500);
      await page.screenshot({path:`${out}/desktop-tour.png`});
      await page.locator('[data-tour-next]').click();await page.waitForTimeout(1600);
      check('tour reaches inspection',await page.evaluate(()=>document.body.dataset.range==='inspect'));
      await page.locator('[data-tour-next]').click();
      await page.locator('#motionToggle').click();
      check('motion preference works',await page.evaluate(()=>document.body.dataset.reducedMotion==='true'));
      await page.locator('[data-inspection-view="rear"]').click();
      await page.waitForTimeout(100);
      check('reduced motion presets settle',await page.evaluate(()=>Math.abs(window.__NOVA_QA__.inspection().modelYaw-Math.PI)<.001));
      await page.locator('#motionToggle').click();
      await page.locator('.masthead-cta').click();await page.waitForTimeout(1000);
      await page.screenshot({path:`${out}/case-study.png`});
      await page.locator('#services').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${out}/services.png`});
      if(!process.env.NOVA_URL){await go(page,0);await page.screenshot({path:'nova/site/media/nova-social.png'});}
    }
    if(label==='mobile'){
      await page.locator('#mobileNavToggle').click();await page.locator('#mobileNavPanel a[href="#sound"]').click();await page.waitForTimeout(1500);
      check('mobile chapter navigation',await page.evaluate(()=>document.body.dataset.range==='spatial'&&document.body.dataset.mobileNav==='closed'));
      await go(page,.90);await page.locator('#productFactsTrigger').click();
      await page.screenshot({path:`${out}/mobile-specs.png`});await page.keyboard.press('Escape');
    }
    await context.close();
  }
  for(const mode of ['static','model-error','reduced']){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
    const page=await context.newPage();
    if(mode==='model-error')await page.route('**/assets/headphones-web.gltf',r=>r.abort());
    await page.goto(url+(mode==='static'?'?static=1':''),{waitUntil:'networkidle'});
    await page.waitForTimeout(800);
    check(mode+' usable story',await page.getByText('Hear beyond.',{exact:true}).count()>0);
    check(mode+' poster available',await page.locator('.product-poster__image').evaluate(el=>el.complete&&el.naturalWidth>0));
    if(mode!=='reduced')check(mode+' disables 3D controls',await page.locator('[data-inspection-view="front"]').isDisabled());
    await page.screenshot({path:`${out}/${mode}.png`});
    await context.close();
  }
}catch(e){report.errors.push(e.stack);}finally{
  await browser.close();
  fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(c=>!c.pass),errors:report.errors},null,2));
  if(report.errors.length||report.checks.some(c=>!c.pass))process.exitCode=1;
}
