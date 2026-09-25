(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORAGE_KEY="leadflow-demo-leads-v3",THEME_KEY="leadflow-theme",CRM_SETTINGS_KEY="leadflow-crm-settings-v2",AUTOMATION_KEY="leadflow-automation-state-v2";
const DEFAULT_SETTINGS={hot:80,review:55,owner:"Growth Team",priority:true,followup:true,queue:true},DEFAULT_AUTOMATION={qualification:true,followup:true,"sales-alert":true};
let currentLead=null,running=false,workflowStartedAt=0,eventEntries=[],lastCrmEvent=null,pendingOpsStory=false,crmReturnFocus=null,drawerReturnFocus=null,followupReturnFocus=null;
let blueprintSteps=["Facebook Lead","Validate","Qualification Rules","CRM","Follow-up Draft","Next Action"],selectedBpIndex=0;
const safeJSON=(key,fallback)=>{try{return {...fallback,...(JSON.parse(localStorage.getItem(key)||"null")||{})}}catch{return {...fallback}}};
const readSettings=()=>{const s=safeJSON(CRM_SETTINGS_KEY,DEFAULT_SETTINGS);return {...s,hot:Number(s.hot||80),review:Number(s.review||55)}};
const readAutomation=()=>safeJSON(AUTOMATION_KEY,DEFAULT_AUTOMATION);
const saveJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function applyTheme(theme){const next=theme==="light"?"light":"dark";document.documentElement.dataset.theme=next;const toggle=$("#themeToggle"),label=$("#themeToggleLabel");if(toggle){toggle.setAttribute("aria-pressed",String(next==="light"));toggle.setAttribute("aria-label",next==="light"?"Switch to dark theme":"Switch to light theme")}if(label)label.textContent=next==="light"?"Light":"Dark";const meta=$('meta[name="theme-color"]');if(meta)meta.content=next==="light"?"#F5F8F6":"#0B1110"}
applyTheme((()=>{try{return localStorage.getItem(THEME_KEY)}catch{return null}})()||"dark");
$("#themeToggle").addEventListener("click",()=>{const next=document.documentElement.dataset.theme==="light"?"dark":"light";applyTheme(next);try{localStorage.setItem(THEME_KEY,next)}catch{}});
const starter=[
{id:"demo-001",name:"Alex Chen",company:"Northstar Labs",source:"Website Form",budget:12000,budgetLabel:"$7,500–$15,000",need:"Need automated CRM lead routing for our inbound requests",timeline:"weeks",timelineLabel:"1–2 weeks",score:87,intent:"High",budgetFit:"Strong",urgency:"High",status:"hot",summary:"Northstar Labs needs automated CRM lead routing. The selected budget and timeline support a sales review.",followup:"Hi Alex,\n\nThanks for sharing the workflow. I’d start by mapping the current intake and deciding which qualification and CRM steps should be automated versus reviewed.\n\nWould a short workflow review this week be useful?",subject:"Re: Lead routing at Northstar Labs",created:"Existing record"},
{id:"demo-002",name:"Mina Patel",company:"Studio Eight",source:"Meta Lead Ads",budget:2000,budgetLabel:"$1,000–$3,000",need:"We need a CRM workflow for contact form follow-up",timeline:"month",timelineLabel:"Within a month",score:67,intent:"Medium",budgetFit:"Good",urgency:"Medium",status:"review",summary:"Studio Eight has a defined automation need. The current score supports human review before a sales handoff.",followup:"Hi Mina,\n\nThanks for the context. There’s a clear automation opportunity here. I’d start by mapping the existing process and identifying which steps should be automated versus kept for human review.\n\nIf useful, I can outline a practical first version for Studio Eight.",subject:"Re: Contact form automation at Studio Eight",created:"Existing record"},
{id:"demo-003",name:"Ryan Cole",company:"Independent",source:"Referral",budget:500,budgetLabel:"Under $1,000",need:"Just exploring options for lead follow-up",timeline:"exploring",timelineLabel:"Just exploring",score:39,intent:"Low",budgetFit:"Limited",urgency:"Low",status:"nurture",summary:"Independent is exploring lead follow-up. Current budget, urgency, or intent signals support nurture rather than immediate sales review.",followup:"Hi Ryan,\n\nThanks for reaching out. A useful first step is to list the repetitive lead tasks you handle manually each week. From there, we can identify the highest-value automation opportunity without overbuilding.\n\nHappy to share a few examples if that helps.",subject:"A few lead automation starting points",created:"Existing record"}
];
function loadLeads(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(Array.isArray(x))return x}catch{}saveJSON(STORAGE_KEY,starter);return [...starter]}
let leads=loadLeads();const saveLeads=()=>saveJSON(STORAGE_KEY,leads);
const storyDirector=window.LeadFlowStorytelling?.createController({root:document});
const budgetLabel=v=>({500:"Under $1,000",2000:"$1,000–$3,000",5000:"$3,000–$7,500",12000:"$7,500–$15,000",25000:"$15,000+"})[String(v)]||"$"+Number(v).toLocaleString();
const timelineLabel=v=>({exploring:"Just exploring",month:"Within a month",weeks:"1–2 weeks",asap:"ASAP"})[v]||v;
function scoreLead(data,settingsOverride=null){const text=(data.need||"").toLowerCase(),budget=Number(data.budget)||0,basePoints=29,budgetPoints=budget>=15000?30:budget>=7500?27:budget>=3000?24:budget>=1000?14:5,timelinePoints={asap:24,weeks:19,month:12,exploring:3}[data.timeline]||5,highIntent=["need","automate","automation","appointment","follow-up","follow up","crm","hubspot","sales","integrat","lead","workflow","booking"],exploratory=["curious","exploring","maybe","someday","learn"],intentPoints=Math.min(16,highIntent.filter(k=>text.includes(k)).length*3),exploratoryPenalty=Math.min(12,exploratory.filter(k=>text.includes(k)).length*4),score=Math.max(18,Math.min(98,basePoints+budgetPoints+timelinePoints+intentPoints-exploratoryPenalty)),settings=settingsOverride||readSettings(),status=score>=settings.hot?"hot":score>=settings.review?"review":"nurture",factors=[{label:"Baseline",points:basePoints},{label:"Budget fit",points:budgetPoints},{label:"Timeline urgency",points:timelinePoints},{label:"Intent terms",points:intentPoints}];if(exploratoryPenalty)factors.push({label:"Exploratory terms",points:-exploratoryPenalty});return{score,intent:score>=settings.hot?"High":score>=settings.review?"Medium":"Low",budgetFit:budget>=3000?"Strong":budget>=1000?"Good":"Limited",urgency:data.timeline==="asap"?"Immediate":data.timeline==="weeks"?"High":data.timeline==="month"?"Medium":"Low",status,factors,routingReason:status==="hot"?"Score "+score+" meets the "+settings.hot+"+ sales-review threshold.":status==="review"?"Score "+score+" falls in the "+settings.review+"–"+(settings.hot-1)+" human-review range.":"Score "+score+" is below the "+settings.review+" review threshold.",action:status==="hot"?"Sales review":status==="review"?"Human review":"Nurture"}}

function workflowStoryLead(){
  if(currentLead)return currentLead;
  const data={name:$("#leadName")?.value?.trim()||"Sarah",company:$("#leadCompany")?.value?.trim()||"Acme Dental",budget:Number($("#leadBudget")?.value||5000),timeline:$("#leadTimeline")?.value||"asap",need:$("#leadNeed")?.value?.trim()||"We need automated appointment lead follow-up"};
  const qual=scoreLead(data);
  return {...data,...qual,action:qual.action};
}
function playWorkflowStory(options={}){return storyDirector?.playWorkflowStory({lead:workflowStoryLead(),...options})||Promise.resolve({status:"complete",story:"workflow"})}

async function qualifyOnServer(data,settings){const proof=$("#backendProof"),status=$("#backendStatus"),trace=$("#backendTrace"),started=performance.now();try{proof.className="backend-proof checking";status.textContent="CONTACTING SERVER";trace.textContent="POST /api/qualify";const r=await fetch("/api/qualify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...data,thresholds:{hot:settings.hot,review:settings.review}})}),p=await r.json();if(!r.ok||!p.ok||!p.qualification)throw new Error();const ms=Math.max(1,Math.round(performance.now()-started));proof.className="backend-proof live";status.textContent="LIVE API RESPONSE";trace.textContent="trace "+String(p.traceId||"").slice(0,8)+" · "+ms+"ms";return{...p.qualification,serverMs:ms,traceId:p.traceId}}catch{proof.className="backend-proof fallback";status.textContent="BROWSER FALLBACK ACTIVE";trace.textContent="server unavailable";return null}}
function makeSummary(data,qual){const clean=data.need.trim().replace(/[.!]+$/,"").replace(/^(we|i)\s+(need|want)\s+/i,"").replace(/^need\s+/i,""),need=clean?clean.charAt(0).toLowerCase()+clean.slice(1):"workflow support";if(qual.status==="hot")return data.company+" needs "+need+". The selected budget and timeline support a sales review.";if(qual.status==="review")return data.company+" needs "+need+". The current score supports human review before a sales handoff.";return data.company+" is exploring "+need+". Current budget, urgency, or intent signals support nurture rather than immediate sales review."}
function makeFollowup(data,qual){const first=data.name.trim().split(/\s+/)[0]||"there";if(qual.status==="hot")return `Hi ${first},\n\nThanks for sharing ${data.company}’s workflow needs. Based on your timeline, the next step would be to review how inquiries arrive and where follow-up is currently handled.\n\nWould you be available for a short workflow review this week?`;if(qual.status==="review")return `Hi ${first},\n\nThanks for the context. There’s a clear automation opportunity here. I’d start by mapping the existing process and identifying which steps should be automated versus kept for human review.\n\nIf useful, I can outline a practical first version for ${data.company}.`;return `Hi ${first},\n\nThanks for reaching out. A useful first step is to list the repetitive lead tasks your team handles manually each week. From there, we can identify the highest-value automation opportunity without overbuilding.\n\nHappy to share a few examples if that helps.`}
const subjectFor=data=>"Re: Automation workflow for "+data.company;
function eventTime(){return workflowStartedAt?((performance.now()-workflowStartedAt)/1000).toFixed(2)+"s":"0.00s"}
function renderEventLog(){const log=$("#eventLog");if(!eventEntries.length){log.innerHTML='<div class="event-empty">Run the workflow to inspect execution events.</div>';$("#eventCount").textContent="0 events";return}log.innerHTML=eventEntries.map(e=>`<div class="event-row ${e.state}"><time>${escapeHtml(e.time)}</time><code>${escapeHtml(e.code)}</code><span>${escapeHtml(e.message)}</span></div>`).join("");$("#eventCount").textContent=eventEntries.length+" event"+(eventEntries.length===1?"":"s");log.scrollTop=log.scrollHeight}
function logEvent(code,message,state="ok"){eventEntries.push({time:eventTime(),code,message,state});renderEventLog()}
function setStep(index,state,note){const step=$(`.exec-step[data-step="${index}"]`);step.classList.remove("active","done");if(state)step.classList.add(state);$(".step-state",step).textContent=state==="done"?"✓":String(index+1);$("em",step).textContent=note||(state==="done"?"Complete":state==="active"?"Running":"Waiting")}
function resetSteps(){$$(".exec-step").forEach((s,i)=>{s.classList.remove("active","done");$(".step-state",s).textContent=String(i+1);$("em",s).textContent="Waiting"});$("#execStatus").textContent="READY";$("#execMessage").textContent="Waiting for a lead";$("#execRunId").textContent="run —";$("#execTimer").textContent="run 0.0s";$("#execProgressBar").style.width="0%";$("#execProgressPulse").style.left="0%";$(".execution-card").classList.remove("running")}
async function runStage(stage,index,reduced){setStep(index,"active",stage.active);$("#execStatus").textContent=String(index+1).padStart(2,"0")+" / 06";$("#execMessage").textContent=stage.messages[0];logEvent(stage.start,stage.messages[0],"live");const duration=reduced?40:stage.duration;for(let i=1;i<stage.messages.length;i++){await delay(duration/stage.messages.length);$("#execMessage").textContent=stage.messages[i]}await delay(duration/stage.messages.length);$("#execProgressBar").style.width=stage.end+"%";$("#execProgressPulse").style.left=`calc(${stage.end}% - 5px)`;setStep(index,"done",stage.done);$("#execMessage").textContent=stage.doneMessage;logEvent(stage.finish,stage.doneMessage,stage.state||"ok")}
async function runWorkflow(data){if(running)return;const automation=readAutomation(),settings=readSettings();if(!automation.qualification){$("#formError").textContent="Lead Qualification is disabled in CRM → Automations.";return}running=true;resetSteps();$("#formError").textContent="";$("#resultEmpty").classList.remove("hidden");$("#resultContent").classList.add("hidden");$(".execution-card").classList.add("running");$("#runAutomation").disabled=true;workflowStartedAt=performance.now();const runId="run-"+Date.now().toString(36).slice(-6);$("#execRunId").textContent=runId;eventEntries=[];logEvent("workflow.started",runId,"info");logEvent("lead.received",data.name+" · "+data.company,"live");const duplicate=leads.find(l=>l.name.toLowerCase()===data.name.toLowerCase()&&l.company.toLowerCase()===data.company.toLowerCase());let qual=scoreLead(data,settings);const serverPromise=qualifyOnServer(data,settings),reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,started=workflowStartedAt;const timer=setInterval(()=>$("#execTimer").textContent="run "+((performance.now()-started)/1000).toFixed(1)+"s",100);
const stages=[
{duration:780,end:8,active:"Checking",done:"Valid",doneMessage:"Payload validated and normalized",start:"validation.parse",finish:"validation.ok",messages:["Parsing lead payload…","Normalizing required fields…","Input schema validated"]},
{duration:900,end:22,active:"Searching",done:duplicate?"Matched":"Clear",doneMessage:duplicate?"Existing CRM record matched by name + company":"No matching CRM record found",start:"duplicate.search",finish:duplicate?"duplicate.match":"duplicate.clear",state:duplicate?"info":"ok",messages:["Checking browser-local CRM…","Comparing name + company…",duplicate?"Existing record detected…":"No matching identity found…"]},
{duration:1250,end:52,active:"Scoring",done:"Scored",doneMessage:"Rules-based qualification complete · "+qual.score+"/100",start:"qualification.rules",finish:"qualification.score",messages:["Reading explicit intent terms…","Applying budget points…","Applying timeline points…","Calculating priority score…"]},
{duration:900,end:69,active:"Updating",done:"Stored",doneMessage:duplicate?"CRM record updated":"New CRM record created",start:"crm.record.upsert",finish:duplicate?"crm.record.updated":"crm.record.created",messages:["Preparing browser record…",duplicate?"Updating existing local record…":"Creating browser-local record…","Confirming CRM state…"]},
{duration:1100,end:91,active:"Drafting",done:"Drafted",doneMessage:automation.followup&&settings.followup?"Follow-up draft prepared · not sent":"Follow-up drafting disabled",start:"followup.compose",finish:automation.followup&&settings.followup?"followup.draft":"followup.skipped",messages:["Using submitted context…","Preparing next-step copy…","Finalizing draft…"]},
{duration:780,end:100,active:"Routing",done:"Prepared",doneMessage:"Next action prepared",start:"routing.evaluate",finish:"routing.prepared",messages:["Selecting routing rule…",qual.status==="hot"?"Preparing sales-review path…":qual.status==="review"?"Preparing human-review path…":"Preparing nurture path…","Saving next-action state…"]}
];
try{for(let i=0;i<stages.length;i++){if(i===2){const server=await serverPromise;if(server){qual=server;stages[2].doneMessage="Live API · rules-based score "+qual.score+"/100 · "+qual.serverMs+"ms";logEvent("api.qualify","Deterministic qualification returned from /api/qualify in "+qual.serverMs+"ms","ok")}else logEvent("api.fallback","Server path unavailable · deterministic browser fallback used","info")}await runStage(stages[i],i,reduced)}}finally{clearInterval(timer)}
const followupEnabled=automation.followup&&settings.followup,lead={id:duplicate?.id||"lead-"+Date.now(),runId,...data,source:data.source||"Website Form",budgetLabel:budgetLabel(data.budget),timelineLabel:timelineLabel(data.timeline),...qual,summary:makeSummary(data,qual),followupGenerated:followupEnabled,followup:followupEnabled?makeFollowup(data,qual):"Follow-up drafting is disabled in CRM controls for this workflow.",subject:followupEnabled?subjectFor(data):"Follow-up drafting disabled",created:new Date().toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})};if(duplicate)leads=leads.map(l=>l.id===duplicate.id?lead:l);else leads.unshift(lead);saveLeads();currentLead=lead;lastCrmEvent={id:lead.id,at:Date.now(),mode:duplicate?"update":"insert",previousLead:duplicate?{...duplicate}:null};showResult(lead);renderAll();pushOpsActivity("workflow.complete",(lead.action||"Next action")+" prepared · "+lead.name,lead.status);logEvent("workflow.complete",(lead.action||"Next action")+" prepared",lead.status==="hot"?"hot":"ok");$("#execMessage").textContent="Workflow complete · "+(lead.action||"Next action")+" prepared";$("#execTimer").textContent="run "+((performance.now()-started)/1000).toFixed(1)+"s";$("#execStatus").textContent="COMPLETE";$(".execution-card").classList.remove("running");$("#runAutomation").disabled=false;$("#runAutomation").innerHTML='Run another lead <span>→</span>';running=false;queueLeadOperationsStory()}
function showResult(lead){const derived=lead.factors?.length?lead:{...lead,...scoreLead(lead)};$("#scoreValue").textContent=lead.score;$("#temperature").textContent=lead.status==="hot"?"HIGH PRIORITY":lead.status==="review"?"NEEDS REVIEW":"NURTURE";$("#temperature").className="temperature "+lead.status;$("#resultLead").textContent=lead.name+" · "+lead.company;$("#intent").textContent=lead.intent;$("#budgetFit").textContent=lead.budgetFit;$("#urgency").textContent=lead.urgency;$("#aiSummary").textContent=lead.summary;$("#scoreFactors").innerHTML=(derived.factors||[]).map(f=>`<span><b>${escapeHtml(f.label)}</b><em class="${f.points<0?"negative":""}">${f.points>0?"+":""}${f.points}</em></span>`).join("");$("#routingReason").textContent=derived.routingReason||"Routing follows the configured score thresholds.";$("#resultAction").textContent="Next action: "+(derived.action||"Review");$("#resultEmpty").classList.add("hidden");$("#resultContent").classList.remove("hidden");$("#showFollowup").disabled=lead.followupGenerated===false;$("#showFollowup").textContent=lead.followupGenerated===false?"Follow-up disabled":"View follow-up draft"}
$("#leadForm").addEventListener("submit",e=>{e.preventDefault();const data={name:$("#leadName").value.trim(),company:$("#leadCompany").value.trim(),budget:Number($("#leadBudget").value),timeline:$("#leadTimeline").value,need:$("#leadNeed").value.trim()},errors=[];if(data.name.length<2)errors.push("Enter a name.");if(data.company.length<2)errors.push("Enter a company.");if(data.need.length<8)errors.push("Describe the automation need in a little more detail.");$("#formError").textContent=errors.join(" ");if(!errors.length)runWorkflow(data)});
const presets={hot:{name:"Sarah",company:"Acme Dental",budget:"5000",timeline:"asap",need:"We need automated appointment lead follow-up"},review:{name:"Maya",company:"Northstar Studio",budget:"2000",timeline:"month",need:"Need a CRM workflow for client inquiries"},nurture:{name:"Jordan",company:"Field Notes Co.",budget:"500",timeline:"exploring",need:"Just exploring options for a future process"}};
$$('[data-lead-preset]').forEach(btn=>btn.addEventListener("click",()=>{const p=presets[btn.dataset.leadPreset];Object.entries({leadName:p.name,leadCompany:p.company,leadBudget:p.budget,leadTimeline:p.timeline,leadNeed:p.need}).forEach(([id,v])=>$("#"+id).value=v);$$('[data-lead-preset]').forEach(b=>b.classList.toggle("active",b===btn));$("#formError").textContent=""}));
const roiAnimationState=new WeakMap();
function animateRoiNumber(el,next,formatter){
  if(!el)return;
  const format=formatter||((value)=>String(Math.round(value*10)/10));
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prior=roiAnimationState.get(el);
  if(prior?.frame)cancelAnimationFrame(prior.frame);
  if(prior?.timer)clearTimeout(prior.timer);
  const previous=Number.isFinite(prior?.current)?prior.current:Number(el.dataset.roiValue ?? next);
  if(reduced||!Number.isFinite(previous)||Math.abs(next-previous)<.01){
    el.textContent=format(next);el.dataset.roiValue=String(next);roiAnimationState.delete(el);return;
  }
  const started=performance.now(),duration=420;
  const state={frame:0,timer:0,current:previous,target:next};
  const finish=()=>{
    if(roiAnimationState.get(el)!==state)return;
    if(state.frame)cancelAnimationFrame(state.frame);
    if(state.timer)clearTimeout(state.timer);
    state.current=next;
    el.textContent=format(next);
    el.dataset.roiValue=String(next);
    roiAnimationState.delete(el);
  };
  const tick=now=>{
    if(roiAnimationState.get(el)!==state)return;
    const t=Math.min(1,(now-started)/duration),eased=1-Math.pow(1-t,3);
    state.current=previous+(next-previous)*eased;
    el.textContent=format(state.current);
    if(t<1)state.frame=requestAnimationFrame(tick);else finish();
  };
  roiAnimationState.set(el,state);
  state.frame=requestAnimationFrame(tick);
  state.timer=setTimeout(finish,duration+120);
}
function animateRoiUpdate({net,value,baseline,post,formatHours,formatMoney}){
  const panel=$(".calc-result");
  if(panel){panel.classList.remove("roi-updated");void panel.offsetWidth;panel.classList.add("roi-updated")}
  animateRoiNumber($("#hoursSaved"),net,v=>(Math.round(v*10)/10).toLocaleString(undefined,{maximumFractionDigits:1}));
  animateRoiNumber($("#netMonthlyValue"),value,formatMoney);
  animateRoiNumber($("#baselineHours"),baseline,formatHours);
  animateRoiNumber($("#postHours"),post,formatHours);
  animateRoiNumber($("#hoursBarValue"),baseline,formatHours);
  animateRoiNumber($("#postBarValue"),post,formatHours);
}
function calc(){
  const leadCount=Math.max(0,Math.min(100000,Number($("#calcLeads").value)||0)),
    mins=Math.max(0,Math.min(240,Number($("#calcMinutes").value)||0)),
    automation=Math.max(0,Math.min(100,Number($("#calcAutomation").value)||0))/100,
    reviewMins=Math.max(0,Math.min(240,Number($("#calcReview").value)||0)),
    cost=Math.max(0,Math.min(1000,Number($("#calcCost").value)||0)),
    operating=Math.max(0,Math.min(100000,Number($("#calcOperating").value)||0)),
    baseline=leadCount*mins/60,
    post=leadCount*(mins*(1-automation)+reviewMins)/60,
    net=baseline-post,
    value=net*cost-operating,
    fh=v=>(Math.round(v*10)/10).toLocaleString(undefined,{maximumFractionDigits:1})+"h",
    fm=v=>(v<0?"-$":"$")+Math.abs(Math.round(v)).toLocaleString();
  $("#netMonthlyValue").classList.toggle("negative",value<0);
  $("#hoursBar").style.width=baseline>0?"100%":"0%";
  $("#costBar").style.width=baseline>0?Math.min(100,post/baseline*100)+"%":"0%";
  animateRoiUpdate({net,value,baseline,post,formatHours:fh,formatMoney:fm});
}
["#calcLeads","#calcMinutes","#calcAutomation","#calcReview","#calcCost","#calcOperating"].forEach(id=>$(id).addEventListener("input",calc));calc();
function generateBlueprint(text){const t=text.toLowerCase(),steps=[];if(t.includes("facebook")||t.includes("meta"))steps.push("Facebook Lead");else if(t.includes("form")||t.includes("website"))steps.push("Web Form");else if(t.includes("email"))steps.push("Email Inquiry");else steps.push("Lead Source");steps.push("Validate");if(t.includes("duplicate")||t.includes("crm")||t.includes("hubspot")||t.includes("pipedrive"))steps.push("Duplicate Check");steps.push("Qualification Rules");if(t.includes("hubspot"))steps.push("HubSpot");else if(t.includes("pipedrive"))steps.push("Pipedrive");else steps.push("CRM");steps.push("Follow-up Draft","Next Action");return [...new Set(steps)].slice(0,7)}
function renderBlueprint(){const flow=$("#blueprintFlow");flow.innerHTML=blueprintSteps.map((s,i)=>`<button type="button" class="bp-node${i===selectedBpIndex?" selected":""}" data-bp-index="${i}">${escapeHtml(s)}</button>${i<blueprintSteps.length-1?"<i>→</i>":""}`).join("");$$('[data-bp-index]').forEach(btn=>btn.addEventListener("click",()=>{selectedBpIndex=Number(btn.dataset.bpIndex);renderBlueprint()}));$("#bpNodeLabel").value=blueprintSteps[selectedBpIndex]||"";$("#bpEditorHint").textContent="Step "+(selectedBpIndex+1)+" of "+blueprintSteps.length;$("#bpMoveLeft").disabled=selectedBpIndex===0;$("#bpMoveRight").disabled=selectedBpIndex===blueprintSteps.length-1;$("#bpRemove").disabled=blueprintSteps.length<=2}
$("#generateBlueprint").addEventListener("click",()=>{blueprintSteps=generateBlueprint($("#processText").value);selectedBpIndex=0;renderBlueprint();$("#blueprintConfidence").textContent="Planning model";$("#blueprintNote").textContent="Planning aid only — edits here do not change the running workflow."});
$("#bpRename").addEventListener("click",()=>{const v=$("#bpNodeLabel").value.trim();if(v){blueprintSteps[selectedBpIndex]=v;renderBlueprint()}});$("#bpMoveLeft").addEventListener("click",()=>{if(selectedBpIndex<=0)return;[blueprintSteps[selectedBpIndex-1],blueprintSteps[selectedBpIndex]]=[blueprintSteps[selectedBpIndex],blueprintSteps[selectedBpIndex-1]];selectedBpIndex--;renderBlueprint()});$("#bpMoveRight").addEventListener("click",()=>{if(selectedBpIndex>=blueprintSteps.length-1)return;[blueprintSteps[selectedBpIndex+1],blueprintSteps[selectedBpIndex]]=[blueprintSteps[selectedBpIndex],blueprintSteps[selectedBpIndex+1]];selectedBpIndex++;renderBlueprint()});$("#bpAdd").addEventListener("click",()=>{blueprintSteps.splice(selectedBpIndex+1,0,"New Step");selectedBpIndex++;renderBlueprint()});$("#bpRemove").addEventListener("click",()=>{if(blueprintSteps.length<=2)return;blueprintSteps.splice(selectedBpIndex,1);selectedBpIndex=Math.min(selectedBpIndex,blueprintSteps.length-1);renderBlueprint()});renderBlueprint();
const stackEls={source:$("#stackSource"),crm:$("#stackCrm"),notify:$("#stackNotify")};function syncStack(){$("#stackFlowSource").textContent=stackEls.source.value;$("#stackFlowCrm").textContent=stackEls.crm.value;$("#stackFlowNotify").textContent=stackEls.notify.value}Object.values(stackEls).forEach(el=>el.addEventListener("change",syncStack));
const edgeCases={duplicate:[["duplicate.search","Matching criterion: normalized name + company","info"],["duplicate.match","Existing browser-local record matched","info"],["crm.record.upsert","Existing record is updated instead of creating another row","ok"],["workflow.complete","No additional CRM record is created","ok"]],timeout:[["crm.timeout","Connection-timeout scenario: external CRM request does not complete","warn"],["retry.plan","Recovery plan: bounded retry with backoff","info"],["pending.production","Delivery retry requires a connected CRM","warn"],["next.step","Connected delivery requires durable retry state and idempotent delivery","info"]],review:[["qualification.score","Rules-based score falls inside the configured review range","warn"],["routing.guardrail","Automatic sales-review path is not selected","info"],["review.queue","Lead remains visible for a person to review","ok"],["workflow.complete","No model-confidence claim is used in this decision","ok"]]};
function renderReliabilityLog(scenario){
  $("#reliabilityLog").innerHTML=(edgeCases[scenario]||[]).map(([c,m,state])=>'<div class="'+state+'"><code>'+escapeHtml(c)+'</code><span>'+escapeHtml(m)+'</span></div>').join("");
}
function playReliabilityStory(scenario,options={}){
  $$("[data-edge]").forEach(btn=>btn.classList.toggle("active",btn.dataset.edge===scenario));
  renderReliabilityLog(scenario);
  return storyDirector?.playReliabilityStory(scenario,{settings:readSettings(),recordCount:leads.length,score:67,...options})||Promise.resolve({status:"complete",story:"reliability"});
}
function selectIncidentBeat(index){
  reliabilityStoryObserver?.cancelPending();
  const section=$("#reliability");
  const scenario=section?.dataset.incidentScenario&&section.dataset.incidentScenario!=="none"
    ?section.dataset.incidentScenario
    :($("[data-edge].active")?.dataset.edge||"duplicate");
  $$("[data-edge]").forEach(btn=>btn.classList.toggle("active",btn.dataset.edge===scenario));
  renderReliabilityLog(scenario);
  const state=storyDirector?.selectReliabilityBeat?.(scenario,index,{settings:readSettings(),recordCount:leads.length,score:67});
  if(section&&state)section.dataset.storyState="inspecting";
  return state;
}
function bindIncidentBeatInteractions(){
  const beats=$$("#reliability .incident-beat-button");
  beats.forEach((beat,index)=>{
    beat.addEventListener("click",()=>selectIncidentBeat(index));
    beat.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){
        event.preventDefault();selectIncidentBeat(index);return;
      }
      let next=null;
      if(event.key==="ArrowRight"||event.key==="ArrowDown")next=Math.min(beats.length-1,index+1);
      if(event.key==="ArrowLeft"||event.key==="ArrowUp")next=Math.max(0,index-1);
      if(event.key==="Home")next=0;
      if(event.key==="End")next=beats.length-1;
      if(next!==null){
        event.preventDefault();
        beats[next].focus();
        selectIncidentBeat(next);
      }
    });
  });
}
$$("[data-edge]").forEach(btn=>btn.addEventListener("click",()=>{reliabilityStoryObserver?.cancelPending();playReliabilityStory(btn.dataset.edge)}));
bindIncidentBeatInteractions();
let opsActivity=[];
function nextActionLabel(lead){
  const raw=String(lead?.action||"");
  if(/sales/i.test(raw)||lead?.status==="hot")return "Sales review";
  if(/human|review/i.test(raw)||lead?.status==="review")return "Human review";
  if(/nurture/i.test(raw)||lead?.status==="nurture")return "Nurture";
  return raw||"Review lead";
}
function dashboardStatusLabel(key){return({hot:"High priority",review:"Needs review",nurture:"Nurture",other:"Other"})[key]||"Other"}
function activitySentence(lead){
  const name=lead?.name||"Lead";
  if(lead?.status==="hot")return name+" qualified as high priority";
  if(lead?.status==="review")return name+" routed to human review";
  if(lead?.status==="nurture")return name+" moved to nurture";
  return name+" updated in the browser-local CRM";
}
function pushOpsActivity(code,message,state="ok"){
  opsActivity.unshift({code,message,state,time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});
  opsActivity=opsActivity.slice(0,6);
  renderOpsActivity();
}
function renderOpsActivity(activityLeads=leads){
  const human=$("#opsActivityFeed"),technical=$("#opsTechnicalActivity");
  if(!human||!technical)return;
  const recent=activityLeads.slice(0,4);
  if(!recent.length){
    human.innerHTML='<div class="ops-empty-state">Run the workflow to create the first local record.</div>';
    technical.innerHTML='<div class="ops-empty-state">No technical events yet.</div>';
    return;
  }
  human.innerHTML=recent.map(l=>'<div class="ops-human-activity '+escapeHtml(l.status||"other")+'"><span class="ops-activity-pulse"></span><div><b>'+escapeHtml(activitySentence(l))+'</b><small>'+escapeHtml(l.company||"")+" · "+escapeHtml(nextActionLabel(l))+'</small></div><em>'+escapeHtml(l.created||"Existing record")+'</em></div>').join("");
  const technicalRows=opsActivity.length?opsActivity:recent.map(l=>({code:"crm.record",message:(l.name||"Lead")+" · "+(l.score||0)+"/100",state:l.status||"other",time:"local"}));
  technical.innerHTML=technicalRows.map(r=>'<div class="ops-activity-row '+escapeHtml(r.state||"other")+'"><span class="ops-activity-pulse"></span><time>'+escapeHtml(r.time)+'</time><code>'+escapeHtml(r.code)+'</code><b>'+escapeHtml(r.message)+'</b></div>').join("");
}
function sourceForLead(l){return String(l?.source||"Unspecified").trim()||"Unspecified"}
function renderDistribution(model,boxSelector="#opsDistribution",legendSelector="#opsDistributionLegend"){
  const box=$(boxSelector),legend=$(legendSelector);
  if(!box||!legend)return;
  const items=[
    ["hot",model.status.hot,model.statusPct.hot],
    ["review",model.status.review,model.statusPct.review],
    ["nurture",model.status.nurture,model.statusPct.nurture],
    ["other",model.status.other,model.statusPct.other]
  ].filter(([,count])=>count>0);
  if(!model.total){
    box.innerHTML='<svg viewBox="0 0 130 130" aria-hidden="true"><circle class="ops-donut-track" cx="65" cy="65" r="50"></circle><text class="ops-donut-number" x="65" y="61" text-anchor="middle">0</text><text class="ops-donut-caption" x="65" y="79" text-anchor="middle">leads</text></svg>';
    box.setAttribute("aria-label","Qualification distribution: no leads yet");
    legend.innerHTML='<div class="ops-empty-state">Run a lead to build the pipeline mix.</div>';
    return;
  }
  let offset=0;
  const segments=items.map(([key,,percent])=>{
    const circle='<circle class="ops-donut-segment '+key+'" data-ops-filter="status" data-ops-value="'+key+'" cx="65" cy="65" r="50" pathLength="100" stroke-dasharray="'+percent+' '+(100-percent)+'" stroke-dashoffset="'+(-offset)+'"></circle>';
    offset+=percent;
    return circle;
  }).join("");
  box.innerHTML='<svg viewBox="0 0 130 130" aria-hidden="true"><circle class="ops-donut-track" cx="65" cy="65" r="50"></circle>'+segments+'<text class="ops-donut-number" x="65" y="61" text-anchor="middle">'+model.total+'</text><text class="ops-donut-caption" x="65" y="79" text-anchor="middle">leads</text></svg>';
  box.setAttribute("aria-label","Qualification distribution: "+items.map(([key,count,p])=>dashboardStatusLabel(key)+" "+count+" ("+p+"%)").join(", "));
  legend.innerHTML=items.map(([key,count,percent])=>'<div class="ops-legend-row" data-ops-filter="status" data-ops-value="'+key+'" tabindex="0" role="button" aria-label="Highlight '+dashboardStatusLabel(key)+' leads"><span class="ops-legend-dot '+key+'"></span><div><b>'+dashboardStatusLabel(key)+'</b><small>'+count+' lead'+(count===1?"":"s")+'</small></div><strong>'+percent+'%</strong></div>').join("");
}
function renderScoreTrend(model,boxSelector="#opsScoreTrend"){
  const box=$(boxSelector);if(!box)return;
  const rows=model.recentScores.slice().reverse();
  if(!rows.length){box.innerHTML='<div class="ops-empty-state">Run a lead to build the score trend.</div>';return}
  const w=720,h=220,left=46,right=16,top=18,bottom=48,plotH=h-top-bottom,plotW=w-left-right;
  const y=score=>top+(100-score)/100*plotH;
  const gap=plotW/rows.length,barW=Math.min(58,Math.max(24,gap*.58));
  const guides=[100,80,55,0].map(v=>'<g class="ops-trend-guide '+(v===80?"hot-threshold":v===55?"review-threshold":"")+'"><line x1="'+left+'" y1="'+y(v)+'" x2="'+(w-right)+'" y2="'+y(v)+'"></line><text x="4" y="'+(y(v)+4)+'">'+v+'</text></g>').join("");
  const bars=rows.map((lead,i)=>{
    const x=left+gap*i+(gap-barW)/2,barY=y(lead.score),barH=top+plotH-barY;
    const first=escapeHtml((lead.name||"Lead").split(/\s+/)[0]);
    return '<g class="ops-trend-bar '+lead.status+'" data-ops-filter="status" data-ops-value="'+escapeHtml(lead.status)+'" tabindex="0" role="button" aria-label="'+first+' score '+lead.score+'"><rect x="'+x+'" y="'+barY+'" width="'+barW+'" height="'+barH+'" rx="4"></rect><text class="score" x="'+(x+barW/2)+'" y="'+(barY-7)+'" text-anchor="middle">'+lead.score+'</text><text class="name" x="'+(x+barW/2)+'" y="'+(h-19)+'" text-anchor="middle">'+first+'</text></g>';
  }).join("");
  box.innerHTML='<svg viewBox="0 0 720 220" role="img" aria-label="Recent lead qualification scores">'+guides+bars+'</svg>';
}
function renderActionQueue(model,boxSelector="#opsActionQueue"){
  const box=$(boxSelector);if(!box)return;
  const rows=[
    ["salesReview","Sales review",model.actions.salesReview,"hot"],
    ["humanReview","Human review",model.actions.humanReview,"review"],
    ["nurture","Nurture",model.actions.nurture,"nurture"],
    ["other","Other",model.actions.other,"other"]
  ].filter(([, ,count])=>count>0);
  if(!rows.length){box.innerHTML='<div class="ops-empty-state">No queued actions yet.</div>';return}
  box.innerHTML=rows.map(([,label,count,state])=>'<div class="ops-queue-row" data-ops-filter="status" data-ops-value="'+state+'" tabindex="0"><span class="ops-queue-icon '+state+'"></span><div><b>'+label+'</b><small>'+count+' lead'+(count===1?"":"s")+'</small></div><strong>'+count+'</strong></div>').join("");
}
function renderSourceQuality(model,boxSelector="#opsSourceQuality"){
  const box=$(boxSelector);if(!box)return;
  if(!model.sources.length){box.innerHTML='<div class="ops-empty-state">No source data yet.</div>';return}
  box.innerHTML=model.sources.map(source=>'<div class="ops-quality-row" data-ops-filter="source" data-ops-value="'+escapeHtml(source.name)+'" tabindex="0" role="button" aria-label="Highlight '+escapeHtml(source.name)+' source performance"><div><b>'+escapeHtml(source.name)+'</b><span>'+source.count+' lead'+(source.count===1?"":"s")+'</span></div><div class="ops-quality-track" aria-label="Average score '+source.averageScore+' out of 100"><i style="width:'+source.averageScore+'%"></i></div><strong>'+source.averageScore+'<small>/100 avg</small></strong></div>').join("");
}
function renderUrgency(model,boxSelector="#opsUrgencyMix"){
  const box=$(boxSelector);if(!box)return;
  const active=model.urgency.filter(i=>i.count>0);
  if(!active.length){box.innerHTML='<div class="ops-empty-state">No timeline data yet.</div>';return}
  box.innerHTML='<div class="ops-urgency-bar">'+active.map(item=>'<span class="'+item.key+'" data-ops-filter="urgency" data-ops-value="'+item.key+'" style="width:'+item.pct+'%" title="'+escapeHtml(item.label)+' '+item.pct+'%"></span>').join("")+'</div><div class="ops-urgency-list">'+active.map(item=>'<div data-ops-filter="urgency" data-ops-value="'+item.key+'" tabindex="0" role="button" aria-label="Highlight '+escapeHtml(item.label)+' timeline"><span class="ops-urgency-dot '+item.key+'"></span><b>'+escapeHtml(item.label)+'</b><strong>'+item.count+'</strong><small>'+item.pct+'%</small></div>').join("")+'</div>';
}

function animateDashboardNumber(el,to){
  if(!el)return;
  const target=Math.max(0,Number(to)||0),reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce){el.textContent=String(Math.round(target));el.dataset.value=String(target);return}
  const from=Number(el.dataset.value||el.textContent||0)||0,start=performance.now(),duration=460;
  const tick=now=>{const p=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-p,3);el.textContent=String(Math.round(from+(target-from)*eased));if(p<1)requestAnimationFrame(tick);else el.dataset.value=String(target)};
  requestAnimationFrame(tick);
}
function animateOpsDistribution(dashboard=$(".ops-dashboard")){
  $$(".ops-donut-segment",dashboard).forEach((el,i)=>el.style.setProperty("--ops-delay",(i*90)+"ms"));
  $$(".ops-legend-row",dashboard).forEach((el,i)=>el.style.setProperty("--ops-delay",(140+i*70)+"ms"));
}
function animateOpsScoreTrend(dashboard=$(".ops-dashboard")){
  $$(".ops-trend-bar",dashboard).forEach((el,i)=>el.style.setProperty("--ops-delay",(i*80)+"ms"));
}
function animateOpsSourceQuality(dashboard=$(".ops-dashboard")){
  $$(".ops-quality-row",dashboard).forEach((el,i)=>el.style.setProperty("--ops-delay",(i*90)+"ms"));
}
function animateOpsUrgencyMix(dashboard=$(".ops-dashboard")){
  $$(".ops-urgency-bar>span",dashboard).forEach((el,i)=>el.style.setProperty("--ops-delay",(i*75)+"ms"));
  $$(".ops-urgency-list>div",dashboard).forEach((el,i)=>el.style.setProperty("--ops-delay",(120+i*65)+"ms"));
}
function clearOpsInfographicEmphasis(dashboard=$(".ops-dashboard")){
  $$("[data-ops-filter]",dashboard).forEach(el=>el.classList.remove("ops-infographic-focus","ops-infographic-dim"));
}
function emphasizeOpsInfographic(group,value,dashboard=$(".ops-dashboard")){
  $$("[data-ops-filter='"+group+"']",dashboard).forEach(el=>{
    const match=el.dataset.opsValue===value;
    el.classList.toggle("ops-infographic-focus",match);
    el.classList.toggle("ops-infographic-dim",!match);
  });
}
function bindOpsInfographicInteractions(){
  const dashboard=$(".ops-dashboard");if(!dashboard||dashboard.dataset.infographicInteractions==="bound")return;
  dashboard.dataset.infographicInteractions="bound";
  const activate=event=>{
    const target=event.target.closest?.("[data-ops-filter]");if(!target||!dashboard.contains(target))return;
    emphasizeOpsInfographic(target.dataset.opsFilter,target.dataset.opsValue,dashboard);
  };
  const release=event=>{
    const target=event.target.closest?.("[data-ops-filter]");if(!target)return;
    const related=event.relatedTarget?.closest?.("[data-ops-filter]");
    if(related&&related.dataset.opsFilter===target.dataset.opsFilter&&related.dataset.opsValue===target.dataset.opsValue)return;
    clearOpsInfographicEmphasis(dashboard);
  };
  dashboard.addEventListener("pointerover",activate);
  dashboard.addEventListener("pointerout",release);
  dashboard.addEventListener("focus",activate,true);
  dashboard.addEventListener("blur",release,true);
}
function replayDashboardMotion(){
  const dashboard=$(".ops-dashboard");if(!dashboard)return;
  animateOpsDistribution(dashboard);
  animateOpsScoreTrend(dashboard);
  animateOpsSourceQuality(dashboard);
  animateOpsUrgencyMix(dashboard);
  dashboard.classList.remove("ops-animate");void dashboard.offsetWidth;dashboard.classList.add("ops-animate");
}
function renderOpsRows(rowLeads,model){
  $("#opsPipelineCount").textContent=Math.min(5,model.total)+" records";
  $("#opsPipelineRows").innerHTML=rowLeads.length?rowLeads.slice(0,5).map(l=>'<tr data-story-lead-id="'+escapeHtml(l.id)+'"><td data-label="Lead"><b>'+escapeHtml(l.name)+'</b><small>'+escapeHtml(l.company)+'</small></td><td data-label="Source">'+escapeHtml(sourceForLead(l))+'</td><td data-label="Score"><strong class="ops-score-cell">'+l.score+'</strong></td><td data-label="Status"><span class="ops-status '+escapeHtml(l.status)+'">'+(l.status==="hot"?"HIGH":l.status==="review"?"REVIEW":"NURTURE")+'</span></td><td data-label="Timeline">'+escapeHtml(l.timelineLabel||"Unspecified")+'</td><td data-label="Next action"><b class="ops-next-action">'+escapeHtml(nextActionLabel(l))+'</b></td></tr>').join(""):'<tr><td colspan="6"><div class="ops-empty-state">No qualified leads yet. Run the workflow to add the first record.</div></td></tr>';
}
function setOpsNumber(el,value,motion=true){if(!el)return;if(motion)animateDashboardNumber(el,value);else{el.textContent=String(Math.round(Number(value)||0));el.dataset.value=String(Number(value)||0)}}
function renderOpsModel(model,rowLeads=leads,{motion=true,activity=true}={}){
  setOpsNumber($("#opsTotal"),model.total,motion);
  setOpsNumber($("#opsHot"),model.status.hot,motion);
  $("#opsHotRate").textContent=model.statusPct.hot+"% of pipeline";
  setOpsNumber($("#opsAverage"),model.averageScore,motion);
  setOpsNumber($("#opsImmediate"),model.immediate.count,motion);
  $("#opsImmediateRate").textContent=model.immediate.pct+"% ASAP";
  renderDistribution(model);renderScoreTrend(model);renderActionQueue(model);renderSourceQuality(model);renderUrgency(model);
  bindOpsInfographicInteractions();
  renderOpsRows(rowLeads,model);
  $("#opsLastSync").textContent="Synced now";
  if(activity)renderOpsActivity(rowLeads);
  if(motion)replayDashboardMotion();
}
function renderOps(){
  const enriched=leads.map(l=>({...l,source:sourceForLead(l),action:l.action||nextActionLabel(l)}));
  const model=window.LeadFlowDashboard.buildDashboardModel(enriched);
  renderOpsModel(model,leads);
}
function getOperationsStoryContext(){
  if(!lastCrmEvent)return null;
  const enrich=l=>({...l,source:sourceForLead(l),action:l.action||nextActionLabel(l)});
  const enriched=leads.map(enrich);
  const event={...lastCrmEvent,previousLead:lastCrmEvent.previousLead?enrich(lastCrmEvent.previousLead):null};
  return window.LeadFlowStorytelling.buildOperationsStoryContext(enriched,event,window.LeadFlowDashboard.buildDashboardModel);
}
function renderOperationsStoryRegion(region,story){
  const model=story.afterModel,rowLeads=story.afterLeads;
  if(region==="total")setOpsNumber($("#opsTotal"),model.total);
  if(region==="status"){setOpsNumber($("#opsHot"),model.status.hot);$("#opsHotRate").textContent=model.statusPct.hot+"% of pipeline"}
  if(region==="average")setOpsNumber($("#opsAverage"),model.averageScore);
  if(region==="distribution")renderDistribution(model);
  if(region==="trend")renderScoreTrend(model);
  if(region==="queue")renderActionQueue(model);
  if(region==="rows")renderOpsRows(rowLeads,model);
  if(region==="activity")renderOpsActivity(rowLeads);
}
function playLeadOperationsStory(options={}){
  const story=getOperationsStoryContext();
  if(!story)return Promise.resolve({status:"complete",story:"operations"});
  $("#opsStoryReplay").disabled=false;
  return storyDirector?.playLeadOperationsStory({
    storyContext:story,
    renderBefore:state=>renderOpsModel(state.beforeModel,state.beforeLeads,{motion:false,activity:true}),
    renderRegion:renderOperationsStoryRegion,
    renderFinal:()=>renderOps(),
    ...options
  })||Promise.resolve({status:"complete",story:"operations"});
}
function createStoryArrivalObserver(target,onArrive,{dwellMs=1000,rootMargin="-24% 0px -38% 0px"}={}){
  if(!target||!("IntersectionObserver" in window))return null;
  let arrivalTimer=null,inBand=false;
  const clearArrival=()=>{if(arrivalTimer){clearTimeout(arrivalTimer);arrivalTimer=null}};
  const schedule=()=>{
    clearArrival();
    if(!inBand||guided)return;
    arrivalTimer=setTimeout(()=>{
      arrivalTimer=null;
      if(inBand&&!guided)onArrive?.();
    },dwellMs);
  };
  const observer=new IntersectionObserver(entries=>{
    const entry=entries.find(item=>item.target===target);
    if(!entry)return;
    inBand=entry.isIntersecting;
    if(!inBand){clearArrival();return}
    schedule();
  },{threshold:0,rootMargin});
  observer.observe(target);
  return {
    disconnect(){clearArrival();observer.disconnect();inBand=false},
    cancelPending(){clearArrival()},
    schedule,
    isArrived(){return inBand}
  };
}
function playWorkspaceArrivalStory(){
  pendingOpsStory=false;
  if(lastCrmEvent)return playLeadOperationsStory();
  renderOps();
  replayDashboardMotion();
  return Promise.resolve({status:"complete",story:"operations"});
}
function queueLeadOperationsStory(){
  pendingOpsStory=true;
  $("#opsStoryReplay").disabled=false;
  if(workspaceStoryObserver?.isArrived())workspaceStoryObserver.schedule();
}
$("#opsStoryReplay")?.addEventListener("click",()=>{workspaceStoryObserver?.cancelPending();playWorkspaceArrivalStory()});
let workspaceStoryObserver=createStoryArrivalObserver($("#workspace"),()=>playWorkspaceArrivalStory(),{dwellMs:1000,rootMargin:"-20% 0px -34% 0px"});

function renderCrmOverviewActivity(){
  const box=$("#crmOverviewActivity");if(!box)return;
  const recent=leads.slice(0,5);
  if(!recent.length){box.innerHTML='<div class="crm-overview-empty">Run the workflow to create the first CRM activity record.</div>';return}
  box.innerHTML=recent.map(l=>'<div class="ops-human-activity '+escapeHtml(l.status||"other")+'"><span class="ops-activity-pulse"></span><div><b>'+escapeHtml(activitySentence(l))+'</b><small>'+escapeHtml(l.company||"")+" · "+escapeHtml(nextActionLabel(l))+'</small></div><em>'+escapeHtml(l.created||"Existing record")+'</em></div>').join("");
}
function replayCrmOverviewMotion(){
  const panel=document.querySelector('[data-crm-panel="leads"]');if(!panel)return;
  panel.classList.remove("crm-overview-animate");void panel.offsetWidth;panel.classList.add("crm-overview-animate");
}
function renderCRM(){
  const q=$("#crmSearch").value.trim().toLowerCase(),filter=$("#crmFilter").value;
  const filtered=leads.filter(l=>(!q||l.name.toLowerCase().includes(q)||l.company.toLowerCase().includes(q))&&(filter==="all"||l.status===filter));
  const enriched=leads.map(l=>({...l,source:sourceForLead(l),action:l.action||nextActionLabel(l)}));
  const model=window.LeadFlowDashboard.buildDashboardModel(enriched);

  animateDashboardNumber($("#crmTotal"),model.total);
  animateDashboardNumber($("#crmHot"),model.status.hot);
  $("#crmHotRate").textContent=model.statusPct.hot+"% of pipeline";
  animateDashboardNumber($("#crmAverage"),model.averageScore);
  animateDashboardNumber($("#crmImmediate"),model.immediate.count);
  $("#crmImmediateRate").textContent=model.immediate.pct+"% ASAP";

  renderDistribution(model,"#crmOverviewDistribution","#crmOverviewDistributionLegend");
  renderScoreTrend(model,"#crmOverviewScoreTrend");
  renderActionQueue(model,"#crmOverviewActionQueue");
  renderSourceQuality(model,"#crmOverviewSourceQuality");
  renderUrgency(model,"#crmOverviewUrgencyMix");
  renderCrmOverviewActivity();

  $("#crmRows").innerHTML=filtered.map(l=>`<tr data-id="${escapeHtml(l.id)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(l.name)} at ${escapeHtml(l.company)}" class="${lastCrmEvent?.id===l.id?"crm-new-row":""}"><td><b>${escapeHtml(l.name)}</b><small>${escapeHtml(l.company)}</small></td><td>${escapeHtml(sourceForLead(l))}</td><td><span class="crm-score">${l.score}</span></td><td><span class="crm-status ${l.status}">${l.status==="hot"?"HIGH":l.status==="review"?"REVIEW":"NURTURE"}</span></td><td>${escapeHtml(l.timelineLabel||"Unspecified")}</td><td><span class="crm-next-action">${escapeHtml(nextActionLabel(l))}</span></td><td>${escapeHtml(l.created||"Existing record")}</td></tr>`).join("");
  $("#crmEmpty").style.display=filtered.length?"none":"block";
  $("#crmPipelineSummary").textContent=filtered.length+" shown · "+model.total+" total";
  $$('#crmRows tr').forEach(row=>{const open=()=>openLead(row.dataset.id);row.addEventListener("click",open);row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}})});
  replayCrmOverviewMotion();
}

function renderAnalytics(){
  const enriched=leads.map(l=>({...l,source:sourceForLead(l),action:l.action||nextActionLabel(l)}));
  const model=window.LeadFlowDashboard.buildDashboardModel(enriched);
  $("#analyticsAvg").textContent=model.averageScore;
  $("#analyticsIntent").textContent=model.statusPct.hot+"%";
  $("#analyticsReview").textContent=model.status.review;
  $("#analyticsUrgent").textContent=model.immediate.pct+"%";
  $("#analyticsTotal").textContent=model.total+" lead"+(model.total===1?"":"s");
  renderDistribution(model,"#analyticsDistribution","#analyticsDistributionLegend");
  renderScoreTrend(model,"#analyticsScoreTrend");
  renderSourceQuality(model,"#analyticsSourceQuality");
  renderUrgency(model,"#analyticsUrgencyMix");
  $("#scoreBandFill").style.width=model.averageScore+"%";
  $("#scoreBandMarker").style.left="calc("+model.averageScore+"% - 6px)";
  const settings=readSettings();
  $("#analyticsInsight").textContent=!model.total
    ?"Run the interactive workflow to populate analytics from browser-local CRM records."
    :model.averageScore>=settings.hot
      ?"The current pipeline average sits in the high-priority range. Review immediate sales handoffs first."
      :model.averageScore>=settings.review
        ?"The pipeline average sits in the review range. Prioritize the human-review queue while high-score leads move to sales review."
        :"The current pipeline is weighted toward nurture. Focus on intent and urgency before escalating sales follow-up.";
}
function renderHistory(){const rows=leads.slice(0,5).map(l=>`<div class="run-history-row"><span class="run-dot ${l.status}"></span><div><b>${escapeHtml(l.name)} · ${escapeHtml(l.company)}</b><small>Qualification → CRM record → ${l.status==="hot"?"sales review":"routing prepared"}</small></div><em>${escapeHtml(l.created)}</em></div>`).join("");$("#runHistoryRows").innerHTML=rows||'<div class="crm-empty" style="display:block">No workflow runs yet.</div>';$("#runHistoryCount").textContent=leads.length+" run"+(leads.length===1?"":"s")}
function renderAll(){renderCRM();renderAnalytics();renderHistory();renderOps()}
const crmTitles={leads:"Lead Operations",analytics:"Pipeline Analytics",automations:"Automation Control",settings:"Workspace Settings"};function switchCrmView(view){const next=crmTitles[view]?view:"leads";$$('.crm-nav-btn').forEach(b=>b.classList.toggle("active",b.dataset.crmView===next));$$('.crm-view').forEach(p=>p.classList.toggle("active",p.dataset.crmPanel===next));$("#crmViewTitle").textContent=crmTitles[next];$("#leadDrawer").classList.remove("open");if(next==="analytics")renderAnalytics();if(next==="automations")renderHistory();if(next==="leads"){const main=$(".crm-main");if(main)main.scrollTop=0;setTimeout(()=>$("#crmSearch").focus({preventScroll:true}),60)}}
$$('.crm-nav-btn').forEach(btn=>btn.addEventListener("click",()=>switchCrmView(btn.dataset.crmView)));
const initialAutomation=readAutomation();$$('.automation-card').forEach(card=>{const enabled=initialAutomation[card.dataset.automation]!==false;card.classList.toggle("enabled",enabled);const btn=$(".automation-toggle",card);btn.setAttribute("aria-pressed",String(enabled));$("em",btn).textContent=enabled?"On":"Off"});$$('.automation-toggle').forEach(btn=>btn.addEventListener("click",()=>{const card=btn.closest('.automation-card'),enabled=!card.classList.contains('enabled');card.classList.toggle('enabled',enabled);btn.setAttribute('aria-pressed',String(enabled));$("em",btn).textContent=enabled?'On':'Off';const state=readAutomation();state[card.dataset.automation]=enabled;saveJSON(AUTOMATION_KEY,state)}));
const settingsEls={hot:$("#hotThreshold"),review:$("#reviewThreshold"),owner:$("#salesOwner"),priority:$("#priorityAlert"),followup:$("#autoFollowup"),queue:$("#reviewQueue")};function syncSettings(){ $("#hotThresholdValue").textContent=settingsEls.hot.value;$("#reviewThresholdValue").textContent=settingsEls.review.value}const saved=readSettings();settingsEls.hot.value=saved.hot;settingsEls.review.value=saved.review;settingsEls.owner.value=saved.owner;settingsEls.priority.checked=saved.priority;settingsEls.followup.checked=saved.followup;settingsEls.queue.checked=saved.queue;syncSettings();[settingsEls.hot,settingsEls.review].forEach(el=>el.addEventListener('input',syncSettings));$("#saveCrmSettings").addEventListener("click",()=>{const hot=Number(settingsEls.hot.value),review=Math.min(Number(settingsEls.review.value),hot-1),payload={hot,review,owner:settingsEls.owner.value,priority:settingsEls.priority.checked,followup:settingsEls.followup.checked,queue:settingsEls.queue.checked};settingsEls.review.value=review;saveJSON(CRM_SETTINGS_KEY,payload);syncSettings();$("#settingsSaved").textContent="Saved · applies to the next workflow run";setTimeout(()=>$("#settingsSaved").textContent="",2200);renderAll()});
function openCrm(){crmReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;renderAll();$("#crmModal").classList.add("open");$("#crmModal").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";switchCrmView("leads")}function closeCrm(){$("#crmModal").classList.remove("open");$("#crmModal").setAttribute("aria-hidden","true");$("#leadDrawer").classList.remove("open");document.body.style.overflow="";if(crmReturnFocus?.isConnected)crmReturnFocus.focus()}["#openCrmTop","#openCrmHero","#openCrmResult","#openCrmFinal","#opsOpenCrm"].forEach(id=>$(id)?.addEventListener("click",()=>{openCrm();if(id==="#openCrmResult"&&currentLead)setTimeout(()=>openLead(currentLead.id),120)}));$("#closeCrm").addEventListener("click",closeCrm);$("#closeCrmTop").addEventListener("click",closeCrm);$("#crmModal").addEventListener("click",e=>{if(e.target===$("#crmModal"))closeCrm()});$("#crmSearch").addEventListener("input",renderCRM);$("#crmFilter").addEventListener("change",renderCRM);
function closeLeadDrawer(){$("#leadDrawer").classList.remove("open");$$('#crmRows tr').forEach(r=>{r.classList.remove('selected');r.removeAttribute('aria-current')});if(drawerReturnFocus?.isConnected)drawerReturnFocus.focus()}$("#closeDrawer").addEventListener("click",closeLeadDrawer);function openLead(id){const l=leads.find(x=>x.id===id);if(!l)return;drawerReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;$("#drawerName").textContent=l.name;$("#drawerCompany").textContent=l.company;$("#drawerScore").textContent=l.score;$("#drawerStatus").textContent=l.status==="hot"?"HIGH PRIORITY":l.status==="review"?"NEEDS REVIEW":"NURTURE";$("#drawerNeed").textContent=l.need;$("#drawerBudget").textContent=l.budgetLabel;$("#drawerTimeline").textContent=l.timelineLabel;$("#drawerSummary").textContent=l.summary;$("#drawerFollowup").textContent=l.followup;$$('#crmRows tr').forEach(r=>{const sel=r.dataset.id===id;r.classList.toggle('selected',sel);if(sel)r.setAttribute('aria-current','true');else r.removeAttribute('aria-current')});$("#leadDrawer").classList.add("open");setTimeout(()=>$("#closeDrawer").focus(),40)}
$("#showFollowup").addEventListener("click",()=>{if(!currentLead)return;followupReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;$("#followupTitle").textContent="Follow-up draft for "+currentLead.name;$("#followupSubject").textContent=currentLead.subject;$("#followupBody").textContent=currentLead.followup;$("#followupModal").classList.add("open");$("#followupModal").setAttribute("aria-hidden","false");setTimeout(()=>$("#closeFollowup").focus(),40)});function closeFollow(){$("#followupModal").classList.remove("open");$("#followupModal").setAttribute("aria-hidden","true");if(followupReturnFocus?.isConnected)followupReturnFocus.focus()}$("#closeFollowup").addEventListener("click",closeFollow);$("#followupModal").addEventListener("click",e=>{if(e.target===$("#followupModal"))closeFollow()});
let guided=false,cancelled=false;
const tourChapters=[
  ["LEAD JOURNEY","Follow an inquiry as it becomes an actionable CRM record."],
  ["QUALIFICATION","Run the six-stage scoring and routing workflow."],
  ["DECISION","See why this lead is prioritized and which action is assigned."],
  ["OPERATIONS","Watch the new decision update the operational workspace."],
  ["RECOVERY","Inspect how a connection failure becomes a visible recovery requirement."],
  ["SYSTEM TRACE","Trace the request through validation, rules, CRM state, and next action."]
];
function updateTourProgress(index,total,{fraction=0,beat=""}={}){
  const safeFraction=Math.max(0,Math.min(1,Number(fraction)||0));
  $("#tourIndex").textContent=index+" / "+total;
  if(beat){$("#tourBeat").textContent=beat;$("#tourLabel").textContent=beat}
  $("#tourProgressBar").style.width=Math.round(((index-1)+safeFraction)/total*100)+"%";
}
function setTourChapter(index,total,chapter,beat){
  $("#tourIndex").textContent=index+" / "+total;
  $("#tourChapter").textContent=chapter;
  $("#tourLabel").textContent=chapter;
  $("#tourBeat").textContent=beat;
  updateTourProgress(index,total,{fraction:0});
}
function tourStoryOptions(index,total){
  return {onProgress:state=>updateTourProgress(index,total,{fraction:state.fraction,beat:state.beat})};
}
function resetTourFocus(){
  $$(".tour-focus").forEach(el=>el.classList.remove("tour-focus"));
}
function focusTourTarget(selector){
  resetTourFocus();
  const target=document.querySelector(selector);
  if(target)target.classList.add("tour-focus");
  return target;
}
function waitForTourScrollSettle({timeout=1800,minWait=120,tolerance=.75,stableFrames=5}={}){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return Promise.resolve(!cancelled);
  const started=performance.now();
  let lastY=scrollY,stable=0;
  return new Promise(resolve=>{
    const sample=()=>{
      if(cancelled){resolve(false);return}
      const elapsed=performance.now()-started,nextY=scrollY;
      if(elapsed>=minWait&&Math.abs(nextY-lastY)<=tolerance)stable+=1;else stable=0;
      lastY=nextY;
      if(stable>=stableFrames||elapsed>=timeout){resolve(!cancelled);return}
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}
async function scrollTourTarget(selector){
  const target=focusTourTarget(selector);
  if(!target)return !cancelled;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({behavior:reduced?"auto":"smooth",block:"center"});
  if(reduced)return !cancelled;
  const settled=await waitForTourScrollSettle();
  if(settled&&!cancelled)await delay(70);
  return settled&&!cancelled;
}
function endTour(){
  storyDirector?.cancelAll();
  guided=false;cancelled=true;resetTourFocus();
  $("#tourStatus").classList.remove("open");$("#tourStatus").setAttribute("aria-hidden","true");
  $("#guidedDemo").disabled=false;$("#guidedDemo").innerHTML='<span class="guided-btn-play" aria-hidden="true">▶</span><span class="guided-btn-label">Watch LeadFlow in action</span>';
  $("#tourProgressBar").style.width="0%";
}
function finishTour(){
  guided=false;cancelled=false;resetTourFocus();
  $("#tourProgressBar").style.width="100%";
  $("#tourChapter").textContent="COMPLETE";
  $("#tourLabel").textContent="Product tour complete";
  $("#tourBeat").textContent="Lead journey, operations, recovery, and system trace are complete.";
  setTimeout(()=>{if(!guided){$("#tourStatus").classList.remove("open");$("#tourStatus").setAttribute("aria-hidden","true");$("#guidedDemo").disabled=false;$("#guidedDemo").innerHTML='<span class="guided-btn-play" aria-hidden="true">▶</span><span class="guided-btn-label">Watch LeadFlow in action</span>';$("#tourProgressBar").style.width="0%"}},900);
}
function tourHoldMs(ms){
  return delay(matchMedia("(prefers-reduced-motion: reduce)").matches?Math.min(320,ms):ms);
}
async function waitForWorkflowCompletion(timeout=12000){
  const started=performance.now();
  while(!cancelled&&performance.now()-started<timeout){
    const done=document.querySelectorAll("#steps .exec-step.done").length;
    if(guided)updateTourProgress(2,6,{fraction:Math.min(.96,Math.max(.08,done/6)),beat:done?done+" of 6 execution stages complete":"Submitting the lead…"});
    if($("#execStatus").textContent==="COMPLETE"&&!running){if(guided)updateTourProgress(2,6,{fraction:1,beat:"All six execution stages complete"});return true}
    await delay(90);
  }
  return false;
}
async function runGuidedWalkthrough(){
  if(guided||running)return;
  guided=true;cancelled=false;
  storyDirector?.cancelAll();
  $("#guidedDemo").disabled=true;$("#guidedDemo").innerHTML='<span class="guided-btn-play guided-btn-live" aria-hidden="true">●</span><span class="guided-btn-label">Product tour in progress</span>';
  $("#tourStatus").classList.add("open");$("#tourStatus").setAttribute("aria-hidden","false");
  const total=6;

  setTourChapter(1,total,...tourChapters[0]);
  if(!await scrollTourTarget("#workflow"))return;
  let storyResult=await playWorkflowStory(tourStoryOptions(1,total));
  if(cancelled||storyResult.status==="cancelled")return;

  setTourChapter(2,total,...tourChapters[1]);
  if(!await scrollTourTarget("#demo"))return;
  await tourHoldMs(260);
  $('[data-lead-preset="hot"]')?.click();
  $("#leadForm").requestSubmit();
  const completed=await waitForWorkflowCompletion();
  if(!completed||cancelled){if(!cancelled)endTour();return}

  setTourChapter(3,total,...tourChapters[2]);
  if(!await scrollTourTarget("#resultCard"))return;
  updateTourProgress(3,total,{fraction:.35,beat:"92 / 100 · high priority"});
  await tourHoldMs(1100);
  updateTourProgress(3,total,{fraction:1,beat:"Sales review is prepared, not sent"});
  if(cancelled)return;

  pendingOpsStory=false;
  setTourChapter(4,total,...tourChapters[3]);
  if(!await scrollTourTarget("#workspace"))return;
  storyResult=await playLeadOperationsStory(tourStoryOptions(4,total));
  if(cancelled||storyResult.status==="cancelled")return;

  setTourChapter(5,total,...tourChapters[4]);
  if(!await scrollTourTarget("#reliability"))return;
  storyResult=await playReliabilityStory("timeout",tourStoryOptions(5,total));
  if(cancelled||storyResult.status==="cancelled")return;

  setTourChapter(6,total,...tourChapters[5]);
  if(!await scrollTourTarget("#architecture"))return;
  storyResult=await playArchitectureStory(tourStoryOptions(6,total));
  if(cancelled||storyResult.status==="cancelled")return;

  if(!cancelled)finishTour();
}
$("#cancelTour").addEventListener("click",()=>{closeCrm();endTour()});
$("#guidedDemo").addEventListener("click",runGuidedWalkthrough);
$("#workflowReplay")?.addEventListener("click",()=>{workflowStoryObserver?.cancelPending();playWorkflowStory()});
let workflowStoryObserver=createStoryArrivalObserver($("#workflow"),()=>playWorkflowStory(),{dwellMs:1000,rootMargin:"-22% 0px -34% 0px"});
function playArchitectureStory(options={}){return storyDirector?.playArchitectureStory({lead:workflowStoryLead(),...options})||Promise.resolve({status:"complete",story:"architecture"})}
$("#architectureReplay")?.addEventListener("click",()=>{architectureStoryObserver?.cancelPending();playArchitectureStory()});
let architectureStoryObserver=createStoryArrivalObserver($("#architecture"),()=>playArchitectureStory(),{dwellMs:1000,rootMargin:"-22% 0px -34% 0px"});
let reliabilityStoryObserver=createStoryArrivalObserver($("#reliability"),()=>{
  const scenario=$("#reliability")?.dataset.incidentScenario;
  playReliabilityStory(scenario&&scenario!=="none"?scenario:"duplicate");
},{dwellMs:1000,rootMargin:"-22% 0px -34% 0px"});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if($("#followupModal").classList.contains("open"))closeFollow();else if($("#crmModal").classList.contains("open"))closeCrm();else if(guided)endTour()}});
renderAll();
})();

/* Presentation reveal choreography */
const revealTargets=[
  ...document.querySelectorAll(".section-head"),
  ...document.querySelectorAll(".brief-grid article"),
  ...document.querySelectorAll(".workflow-map article"),
  ...document.querySelectorAll(".demo-layout"),
  ...document.querySelectorAll(".ops-dashboard"),
  ...document.querySelectorAll(".reliability-lab"),
  ...document.querySelectorAll(".architecture"),
  ...document.querySelectorAll(".stack-configurator"),
  ...document.querySelectorAll(".implementation-proof article"),
  ...document.querySelectorAll(".calculator"),
  ...document.querySelectorAll(".blueprint-layout"),
  ...document.querySelectorAll(".case-grid"),
  ...document.querySelectorAll(".portfolio-next-card"),
  ...document.querySelectorAll(".final-cta")
];
revealTargets.forEach(el=>el.classList.add("reveal-on-scroll"));
[".brief-grid",".workflow-map",".implementation-proof"].forEach(selector=>{
  document.querySelectorAll(selector).forEach(group=>{
    group.querySelectorAll(":scope > article").forEach((el,index)=>{
      el.dataset.revealDelay=String(index+1);
    });
  });
});
if("IntersectionObserver" in window){
  const revealObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },{threshold:.12,rootMargin:"0px 0px -6% 0px"});
  revealTargets.forEach(el=>revealObserver.observe(el));
  const sectionObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting)entry.target.classList.add("is-section-visible");
    }
  },{threshold:.12});
  document.querySelectorAll(".section").forEach(section=>sectionObserver.observe(section));
}else{
  revealTargets.forEach(el=>el.classList.add("is-visible"));
  document.querySelectorAll(".section").forEach(section=>section.classList.add("is-section-visible"));
}

function revealOpenedDetails(details){
  if(!details?.open)return;
  details.querySelectorAll(".reveal-on-scroll").forEach(el=>el.classList.add("is-visible"));
  details.closest(".section")?.classList.add("is-section-visible");
  requestReadingState();
}
document.querySelectorAll("details").forEach(details=>{
  details.addEventListener("toggle",()=>revealOpenedDetails(details));
  revealOpenedDetails(details);
});

/* Active-section orientation for the long-form presentation. */
const navSectionLinks=[...document.querySelectorAll(".desktop-nav a[href^='#']")];
const presentationProgressBar=document.querySelector("#presentationProgressBar");
function updateReadingState(){
  const navHeight=document.querySelector(".nav")?.getBoundingClientRect().height||78;
  const readingLine=navHeight+52;
  const navTargets=navSectionLinks.map(link=>document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const firstTarget=navTargets[0]||null;
  let activeTarget=null;
  if(!(firstTarget&&firstTarget.getBoundingClientRect().top>readingLine)){
    for(const target of navTargets){
      if(target.getBoundingClientRect().top<=readingLine)activeTarget=target;
    }
  }
  navSectionLinks.forEach(link=>link.classList.toggle("is-active",!!activeTarget&&link.getAttribute("href")==="#"+activeTarget.id));
  if(presentationProgressBar){
    const scrollable=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    presentationProgressBar.style.transform="scaleX("+Math.max(0,Math.min(1,scrollY/scrollable))+")";
  }
}
let readingStateQueued=false;
function requestReadingState(){
  if(readingStateQueued)return;
  readingStateQueued=true;
  requestAnimationFrame(()=>{readingStateQueued=false;updateReadingState()});
}
addEventListener("scroll",requestReadingState,{passive:true});
addEventListener("resize",requestReadingState,{passive:true});
navSectionLinks.forEach(link=>link.addEventListener("click",()=>setTimeout(updateReadingState,420)));
updateReadingState();
