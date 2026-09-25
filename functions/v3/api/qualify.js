function scoreLead(data){
  const text=String(data.need||"").toLowerCase();
  const budget=Number(data.budget)||0;
  const basePoints=29;
  const budgetPoints=budget>=15000?30:budget>=7500?27:budget>=3000?24:budget>=1000?14:5;
  const timelinePoints={asap:24,weeks:19,month:12,exploring:3}[data.timeline]||5;
  const highIntent=["need","automate","automation","appointment","follow-up","follow up","crm","hubspot","sales","integrat","lead","workflow","booking"];
  const exploratory=["curious","exploring","maybe","someday","learn"];
  const intentPoints=Math.min(16,highIntent.filter(k=>text.includes(k)).length*3);
  const exploratoryPenalty=Math.min(12,exploratory.filter(k=>text.includes(k)).length*4);
  const score=Math.max(18,Math.min(98,basePoints+budgetPoints+timelinePoints+intentPoints-exploratoryPenalty));
  const hot=Math.max(60,Math.min(98,Number(data?.thresholds?.hot)||80));
  const review=Math.max(20,Math.min(hot-1,Number(data?.thresholds?.review)||55));
  const status=score>=hot?"hot":score>=review?"review":"nurture";
  const factors=[{label:"Baseline",points:basePoints},{label:"Budget fit",points:budgetPoints},{label:"Timeline urgency",points:timelinePoints},{label:"Intent terms",points:intentPoints}];
  if(exploratoryPenalty) factors.push({label:"Exploratory terms",points:-exploratoryPenalty});
  return {score,intent:score>=hot?"High":score>=review?"Medium":"Low",budgetFit:budget>=3000?"Strong":budget>=1000?"Good":"Limited",urgency:data.timeline==="asap"?"Immediate":data.timeline==="weeks"?"High":data.timeline==="month"?"Medium":"Low",status,thresholds:{hot,review},factors,routingReason:status==="hot"?"Score "+score+" meets the "+hot+"+ sales-review threshold.":status==="review"?"Score "+score+" falls in the "+review+"–"+(hot-1)+" human-review range.":"Score "+score+" is below the "+review+" review threshold.",action:status==="hot"?"Sales review":status==="review"?"Human review":"Nurture"};
}
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}})}
export async function onRequestPost({request}){const traceId=crypto.randomUUID();try{const data=await request.json();const missing=["name","company","need","timeline"].filter(k=>!String(data?.[k]??"").trim());if(missing.length)return json({ok:false,error:"validation_error",missing,traceId},400);if(!Number.isFinite(Number(data.budget)))return json({ok:false,error:"invalid_budget",traceId},400);return json({ok:true,traceId,engine:"deterministic-qualification-v2",qualification:scoreLead(data),processedAt:new Date().toISOString()})}catch{return json({ok:false,error:"invalid_json",traceId},400)}}
export function onRequestGet(){return json({ok:true,service:"leadflow-qualification-api",engine:"deterministic-qualification-v2"})}
