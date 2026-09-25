(()=>{
  const STORY_NAMES=["workflow","operations","reliability","architecture"];

  function prefersReducedMotion(){
    try{return !!matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return false}
  }

  function buildOperationsStoryContext(leads,event,buildModel){
    const afterLeads=Array.isArray(leads)?leads.map(lead=>({...lead})):[];
    const latestLead=(event?.id&&afterLeads.find(lead=>lead.id===event.id))||afterLeads[0]||null;
    const mode=event?.mode||"snapshot";
    let beforeLeads=afterLeads.map(lead=>({...lead}));
    if(latestLead&&mode==="insert"){
      beforeLeads=beforeLeads.filter(lead=>lead.id!==latestLead.id);
    }else if(latestLead&&mode==="update"&&event?.previousLead){
      beforeLeads=beforeLeads.map(lead=>lead.id===latestLead.id?{...event.previousLead}:lead);
    }
    const beforeModel=buildModel(beforeLeads),afterModel=buildModel(afterLeads);
    return {
      mode,
      latestLead,
      beforeLeads,
      afterLeads,
      beforeModel,
      afterModel,
      delta:{
        total:afterModel.total-beforeModel.total,
        hot:afterModel.status.hot-beforeModel.status.hot,
        review:afterModel.status.review-beforeModel.status.review,
        nurture:afterModel.status.nurture-beforeModel.status.nurture,
        averageScore:afterModel.averageScore-beforeModel.averageScore,
        immediate:afterModel.immediate.count-beforeModel.immediate.count,
        salesReview:afterModel.actions.salesReview-beforeModel.actions.salesReview,
        humanReview:afterModel.actions.humanReview-beforeModel.actions.humanReview,
        actionNurture:afterModel.actions.nurture-beforeModel.actions.nurture
      }
    };
  }

  function createController(options={}){
    let globalEpoch=0;
    const storyEpoch=new Map();
    const animations=new Set();

    const nextStoryEpoch=story=>{
      const next=(storyEpoch.get(story)||0)+1;
      storyEpoch.set(story,next);
      return next;
    };

    const isCancelled=(story,epoch,global)=>global!==globalEpoch||storyEpoch.get(story)!==epoch;

    function cancelAnimations(){
      animations.forEach(animation=>{try{animation.cancel()}catch{}});
      animations.clear();
    }

    function cancelAll(){
      globalEpoch+=1;
      STORY_NAMES.forEach(nextStoryEpoch);
      cancelAnimations();
      document?.documentElement?.classList?.remove("story-active");
      document?.querySelectorAll?.(".story-focus")?.forEach?.(el=>el.classList.remove("story-focus"));
    }

    function wait(ms,context){
      const duration=context.reducedMotion?Math.min(24,Math.max(0,ms)):Math.max(0,ms);
      return new Promise(resolve=>setTimeout(resolve,duration));
    }

    async function animateElement(el,keyframes,timing,context){
      if(!el||context.cancelled())return;
      if(context.reducedMotion||typeof el.animate!=="function"){
        const final=Array.isArray(keyframes)?keyframes[keyframes.length-1]:keyframes;
        if(final&&el.style){
          for(const [key,value] of Object.entries(final)){
            if(["offset","easing","composite"].includes(key))continue;
            try{el.style[key]=value}catch{}
          }
        }
        await wait(1,context);
        return;
      }
      const animation=el.animate(keyframes,timing);
      animations.add(animation);
      try{await animation.finished}catch{}
      animations.delete(animation);
    }

    async function genericDirector(context,storyOptions){
      const beats=Array.isArray(storyOptions.beats)?storyOptions.beats:[];
      for(let index=0;index<beats.length;index++){
        if(context.cancelled())return;
        const beat=beats[index]||{};
        if(typeof storyOptions.onBeat==="function")await storyOptions.onBeat(beat,index,context);
        await context.wait(Number(beat.hold)||0);
      }
    }

    const q=(selector,root=options.root||document)=>root.querySelector(selector);
    const qa=(selector,root=options.root||document)=>[...root.querySelectorAll(selector)];

    function routeLabel(lead){
      if(lead?.action)return lead.action;
      if(lead?.status==="hot")return "Sales review";
      if(lead?.status==="review")return "Human review";
      return "Nurture";
    }

    function priorityLabel(lead){
      if(lead?.status==="hot")return "High priority";
      if(lead?.status==="review")return "Needs review";
      return "Nurture";
    }

    async function workflowDirector(context,storyOptions){
      const section=q("#workflow"),packet=q("#workflowStoryPacket"),caption=q("#workflowStoryCaption"),detail=q("#workflowStoryDetail");
      const stages=qa("#workflow .workflow-stage"),connectors=qa("#workflow .workflow-story-connector");
      if(!section||!packet||stages.length!==4)return;
      const lead=storyOptions.lead||{name:"Sarah",company:"Acme Dental",score:92,status:"hot",action:"Sales review"};
      section.dataset.storyState="playing";
      stages.forEach(stage=>stage.classList.remove("story-focus","story-stage-complete"));
      connectors.forEach(connector=>connector.classList.remove("story-connector-complete"));
      packet.style.opacity="1";

      const track=q("#workflow .workflow-story-track");
      const positionFor=stage=>{
        const tr=track.getBoundingClientRect(),sr=stage.getBoundingClientRect(),pr=packet.getBoundingClientRect();
        return Math.max(0,sr.left-tr.left+sr.width/2-pr.width/2);
      };
      let x=positionFor(stages[0]);
      packet.style.transform="translate3d("+x+"px,0,0)";

      async function setBeat(index,title,copy,hold=620){
        if(context.cancelled())return false;
        stages.forEach((stage,i)=>stage.classList.toggle("story-focus",i===index));
        if(caption)caption.textContent=title;
        if(detail)detail.textContent=copy;
        await context.wait(hold);
        if(context.cancelled())return false;
        stages[index].classList.add("story-stage-complete");
        return true;
      }

      async function travel(toIndex){
        const next=positionFor(stages[toIndex]);
        connectors[toIndex-1]?.classList.add("story-connector-complete");
        await context.animate(packet,[{transform:"translate3d("+x+"px,0,0)"},{transform:"translate3d("+next+"px,0,0)"}],{duration:context.reducedMotion?1:560,easing:"cubic-bezier(.22,.75,.2,1)",fill:"forwards"});
        x=next;
        packet.style.transform="translate3d("+x+"px,0,0)";
      }

      if(!await setBeat(0,"Lead received",(lead.name||"Lead")+" · "+(lead.company||"Incoming inquiry"),650))return;
      await travel(1);
      if(!await setBeat(1,"Required fields valid","Name, company, budget, timeline and need are ready for scoring.",650))return;
      await travel(2);
      if(!await setBeat(2,(lead.score??92)+" / 100 · "+priorityLabel(lead),"Budget, urgency and intent resolve to a transparent qualification state.",760))return;
      await travel(3);
      if(!await setBeat(3,routeLabel(lead)+" prepared","The CRM state and next-action path are ready for review.",760))return;

      stages.forEach(stage=>stage.classList.remove("story-focus"));
      stages[3].classList.add("story-focus");
      section.dataset.storyState="complete";
      if(caption)caption.textContent=routeLabel(lead)+" prepared";
      if(detail)detail.textContent=(lead.name||"Lead")+" completes the workflow with a visible, inspectable next action.";
    }

    const reliabilityStories={
      duplicate:{beats:[
        ["Incoming identity","Name + company are normalized before CRM matching."],
        ["Existing record matched","A browser-local record with the same identity already exists."],
        ["Existing record updated","The workflow upserts the matching record instead of creating another row."],
        ["No duplicate row","Pipeline count stays unchanged after the update."]
      ]},
      review:{beats:[
        ["Score enters review range","The deterministic score lands between the configured review and high-priority thresholds."],
        ["Review band detected","Automatic sales review is not selected for this score."],
        ["Human review selected","The lead remains visible and is routed to a person for review."],
        ["Safe visible state","No model-confidence claim is used to make this routing decision."]
      ]},
      timeout:{beats:[
        ["External CRM request","The public demo starts a simulated external-CRM failure story."],
        ["Timeout detected","The simulated outbound request does not complete."],
        ["Retry plan prepared","An illustrative bounded retry path is shown, but no retry job runs."],
        ["RETRY NOT EXECUTED IN THIS PUBLIC DEMO","Production requires durable retry state and idempotent delivery."]
      ]}
    };

    async function reliabilityDirector(context,storyOptions){
      const incidentScenario=storyOptions.scenario||"duplicate";
      const config=reliabilityStories[incidentScenario]||reliabilityStories.duplicate;
      const section=q("#reliability"),beats=qa("#reliability [data-incident-beat]"),scenes=qa("#reliability [data-incident-scene]");
      if(!section||beats.length!==4)return;
      section.dataset.storyState="playing";
      section.dataset.incidentScenario=incidentScenario;
      scenes.forEach(scene=>scene.classList.toggle("active",scene.dataset.incidentScene===incidentScenario));
      beats.forEach(beat=>beat.classList.remove("incident-focus","incident-complete"));

      const boundary=q("#incidentBoundary");
      if(boundary)boundary.classList.toggle("visible",incidentScenario==="timeout");

      if(incidentScenario==="duplicate"){
        const incoming=q("#incidentDuplicateIncoming"),existing=q("#incidentDuplicateExisting"),count=q("#incidentDuplicateCount");
        if(count){const n=Number(storyOptions.recordCount)||3;count.textContent=n+" → "+n+" records"}
        incoming?.classList.remove("merged");
        existing?.classList.remove("matched");
      }
      if(incidentScenario==="review"){
        const marker=q("#incidentReviewMarker"),settings=storyOptions.settings||{review:55,hot:80};
        const score=Number(storyOptions.score)||Math.min(settings.hot-1,Math.max(settings.review,67));
        if(marker){marker.style.left=score+"%";marker.setAttribute("aria-label",score+" score")}
        q("#reliability .sales-route")?.classList.remove("dimmed");
        q("#reliability .human-route")?.classList.remove("selected");
      }
      if(incidentScenario==="timeout"){
        q("#incidentTimeoutRequest")?.classList.remove("failed");
        q("#reliability .timeout-link")?.classList.remove("failed");
        q("#incidentRetryPlan")?.classList.remove("visible");
      }

      for(let index=0;index<4;index++){
        if(context.cancelled())return;
        beats.forEach((beat,i)=>beat.classList.toggle("incident-focus",i===index));
        const title=q("#incidentBeatTitle"+index),copy=q("#incidentBeatCopy"+index);
        if(title)title.textContent=config.beats[index][0];
        if(copy)copy.textContent=config.beats[index][1];

        if(incidentScenario==="duplicate"){
          if(index===0)await context.animate(q("#incidentDuplicateIncoming"),[{transform:"translateX(-14px)",opacity:.35},{transform:"translateX(0)",opacity:1}],{duration:420,easing:"ease-out",fill:"forwards"});
          if(index===1)q("#incidentDuplicateExisting")?.classList.add("matched");
          if(index===2)q("#incidentDuplicateIncoming")?.classList.add("merged");
        }
        if(incidentScenario==="review"){
          if(index===1)q("#reliability .sales-route")?.classList.add("dimmed");
          if(index===2)q("#reliability .human-route")?.classList.add("selected");
        }
        if(incidentScenario==="timeout"){
          if(index===1){
            q("#incidentTimeoutRequest")?.classList.add("failed");
            q("#reliability .timeout-link")?.classList.add("failed");
          }
          if(index===2)q("#incidentRetryPlan")?.classList.add("visible");
        }

        await context.wait(index===3?760:620);
        if(context.cancelled())return;
        beats[index].classList.add("incident-complete");
      }

      beats.forEach(beat=>beat.classList.remove("incident-focus"));
      section.dataset.storyState="complete";
    }

    async function operationsDirector(context,storyOptions){
      const story=storyOptions.storyContext,section=q("#workspace"),dashboard=q("#workspace .ops-dashboard");
      const headline=q("#opsStoryHeadline"),detail=q("#opsStoryDetail"),token=q("#opsStoryToken");
      if(!story?.latestLead||!section||!dashboard)return;
      const lead=story.latestLead;
      section.dataset.storyState="playing";
      dashboard.classList.add("ops-story-playing");
      qa("#workspace .ops-story-focus").forEach(el=>el.classList.remove("ops-story-focus"));
      if(token){
        token.textContent=(lead.name||"Lead").split(/\s+/)[0]+" · "+(lead.score??0);
        token.className="ops-story-token "+(lead.status||"other")+" visible";
      }
      storyOptions.renderBefore?.(story);

      const focus=async(selector,title,copy,region,hold=520)=>{
        if(context.cancelled())return false;
        qa("#workspace .ops-story-focus").forEach(el=>el.classList.remove("ops-story-focus"));
        const target=q(selector);
        target?.classList.add("ops-story-focus");
        if(headline)headline.textContent=title;
        if(detail)detail.textContent=copy;
        if(region)storyOptions.renderRegion?.(region,story);
        await context.wait(hold);
        return !context.cancelled();
      };

      if(story.mode==="insert"){
        if(!await focus("#workspace .ops-kpis article:nth-child(1)","New lead enters operations",(lead.name||"Lead")+" adds one browser-local CRM record.","total",560))return;
      }else{
        if(!await focus("#workspace .ops-kpis article:nth-child(1)","Existing record updated","Duplicate identity matched · pipeline remains "+story.afterModel.total+" records.","total",560))return;
      }

      const statusTitle=lead.status==="hot"?"High-priority workload changes":lead.status==="review"?"Review workload changes":"Nurture workload changes";
      if(!await focus("#workspace .ops-kpis article:nth-child(2)",statusTitle,(lead.score??0)+"/100 resolves to "+routeLabel(lead)+".","status",520))return;
      if(!await focus("#workspace .ops-kpis article:nth-child(3)","Average qualification score updates",story.beforeModel.averageScore+" → "+story.afterModel.averageScore+" across the current pipeline.","average",520))return;
      if(!await focus("#workspace .ops-distribution-panel","Pipeline mix responds","Qualification distribution now includes the latest "+priorityLabel(lead).toLowerCase()+" state.","distribution",560))return;
      if(!await focus("#workspace .ops-trend-panel","The newest score becomes visible",(lead.name||"Lead")+" appears at "+(lead.score??0)+"/100 in the recent score view.","trend",560))return;
      if(!await focus("#workspace .ops-analytics-secondary .ops-panel:first-child","Next action workload updates",routeLabel(lead)+" is now represented in the attention queue.","queue",520))return;
      storyOptions.renderRegion?.("rows",story);
      const rowSelector='#opsPipelineRows tr[data-story-lead-id="'+String(lead.id||"").replace(/"/g,"")+'"]';
      if(!await focus(rowSelector,"The operational record is ready",(lead.name||"Lead")+" is visible with score, status, urgency and next action.",null,560))return;
      if(!await focus("#workspace .ops-activity-panel","The change is auditable","Recent Activity records what changed without hiding the technical state.","activity",520))return;

      storyOptions.renderFinal?.(story);
      qa("#workspace .ops-story-focus").forEach(el=>el.classList.remove("ops-story-focus"));
      dashboard.classList.remove("ops-story-playing");
      section.dataset.storyState="complete";
      if(headline)headline.textContent="LATEST IMPACT · "+(lead.name||"Lead")+" → "+(lead.score??0)+"/100 → "+routeLabel(lead);
      if(detail)detail.textContent=story.mode==="update"?"Existing record updated · pipeline count stayed truthful.":"One lead changed the visible operational state.";
      if(token)token.classList.add("settled");
    }

    async function architectureDirector(context,storyOptions){
      const section=q("#architecture"),stage=q("#architecture .architecture-story-stage"),layout=q("#architecture .architecture");
      const caption=q("#architectureStoryCaption"),detail=q("#architectureStoryDetail"),main=q("#architecturePayload");
      const rulesToken=q("#architectureRulesPayload"),crmToken=q("#architectureCrmPayload");
      const nodes={
        input:q('#architecture [data-arch-node="input"]'),
        api:q('#architecture [data-arch-node="api"]'),
        rules:q('#architecture [data-arch-node="rules"]'),
        crm:q('#architecture [data-arch-node="crm"]'),
        next:q('#architecture [data-arch-node="next"]')
      };
      if(!section||!stage||!layout||Object.values(nodes).some(x=>!x))return;
      section.dataset.storyState="playing";
      layout.classList.remove("arch-branch-active","arch-reconverged");
      qa("#architecture [data-arch-node]").forEach(el=>el.classList.remove("arch-story-focus","arch-story-complete"));
      [main,rulesToken,crmToken].forEach(el=>{if(el){el.classList.remove("visible","settled");el.style.opacity="0"}});

      const center=node=>{
        const sr=stage.getBoundingClientRect(),nr=node.getBoundingClientRect();
        return {x:nr.left-sr.left+nr.width/2,y:nr.top-sr.top+nr.height/2};
      };
      const move=async(el,from,to,duration=540)=>{
        if(!el)return;
        el.classList.add("visible");el.style.opacity="1";
        const rect=el.getBoundingClientRect(),ox=rect.width/2,oy=rect.height/2;
        await context.animate(el,[
          {transform:"translate3d("+(from.x-ox)+"px,"+(from.y-oy)+"px,0)",opacity:1},
          {transform:"translate3d("+(to.x-ox)+"px,"+(to.y-oy)+"px,0)",opacity:1}
        ],{duration:context.reducedMotion?1:duration,easing:"cubic-bezier(.22,.75,.2,1)",fill:"forwards"});
        el.style.transform="translate3d("+(to.x-ox)+"px,"+(to.y-oy)+"px,0)";
      };
      const focus=async(node,title,copy,hold=560)=>{
        qa("#architecture [data-arch-node]").forEach(el=>el.classList.remove("arch-story-focus"));
        node.classList.add("arch-story-focus");
        if(caption)caption.textContent=title;
        if(detail)detail.textContent=copy;
        await context.wait(hold);
        node.classList.add("arch-story-complete");
        return !context.cancelled();
      };

      const input=center(nodes.input),api=center(nodes.api),rules=center(nodes.rules),crm=center(nodes.crm),next=center(nodes.next);
      if(main){main.style.opacity="1";main.style.transform="translate3d("+(input.x-28)+"px,"+(input.y-14)+"px,0)"}
      if(!await focus(nodes.input,"Lead enters the system","Structured browser input becomes the payload for the qualification request.",520))return;
      if(caption)caption.textContent="Validate request";
      if(detail)detail.textContent="POST /api/qualify reaches the Cloudflare Pages Function.";
      await move(main,input,api,560);
      if(!await focus(nodes.api,"Validate request","Required fields are validated and the API returns a traceable, no-store response.",620))return;

      layout.classList.add("arch-branch-active");
      if(rulesToken){rulesToken.style.opacity="1";rulesToken.style.transform=main?.style.transform||""}
      if(crmToken){crmToken.style.opacity="1";crmToken.style.transform=main?.style.transform||""}
      if(main)main.style.opacity="0";
      if(caption)caption.textContent="Branch the payload";
      if(detail)detail.textContent="The same validated lead feeds deterministic rules and browser-local CRM state.";
      await Promise.all([move(rulesToken,api,rules,520),move(crmToken,api,crm,520)]);
      if(!await focus(nodes.rules,"Score intent + budget + urgency","Qualification Rules resolve score, status, and routing category.",560))return;
      if(!await focus(nodes.crm,"Persist browser-local state","Demo CRM stores or updates the record locally; no external CRM message is sent.",560))return;

      layout.classList.add("arch-reconverged");
      if(caption)caption.textContent="Reconverge score + CRM state";
      if(detail)detail.textContent="Qualification result and CRM state meet before the next action is prepared.";
      await Promise.all([move(rulesToken,rules,next,520),move(crmToken,crm,next,520)]);
      if(rulesToken)rulesToken.style.opacity=".25";
      if(crmToken)crmToken.style.opacity=".25";
      if(main){main.style.opacity="1";await move(main,api,next,360)}
      if(!await focus(nodes.next,"Prepare next action","Draft, review, or nurture state is prepared in the demo with no outbound delivery.",700))return;

      qa("#architecture [data-arch-node]").forEach(el=>el.classList.remove("arch-story-focus"));
      nodes.next.classList.add("arch-story-focus");
      section.dataset.storyState="complete";
      if(caption)caption.textContent="Trace complete · Next action prepared";
      if(detail)detail.textContent="One lead moved through validation, rules, browser-local CRM state, and a visible next action.";
      main?.classList.add("settled");
    }

    const directors={
      workflow:workflowDirector,
      operations:operationsDirector,
      reliability:reliabilityDirector,
      architecture:architectureDirector
    };

    async function run(story,storyOptions={}){
      const epoch=nextStoryEpoch(story);
      const global=globalEpoch;
      const reducedMotion=storyOptions.reducedMotion??prefersReducedMotion();
      const context={
        story,
        reducedMotion,
        root:options.root||document,
        options:storyOptions,
        cancelled:()=>isCancelled(story,epoch,global),
        wait:ms=>wait(ms,{story,reducedMotion,cancelled:()=>isCancelled(story,epoch,global)}),
        animate:(el,keyframes,timing)=>animateElement(el,keyframes,timing,{story,reducedMotion,cancelled:()=>isCancelled(story,epoch,global)})
      };
      context.root?.documentElement?.classList?.add?.("story-active");
      try{
        await directors[story](context,storyOptions);
        return {status:context.cancelled()?"cancelled":"complete",story,reducedMotion};
      }finally{
        if(!context.cancelled())context.root?.documentElement?.classList?.remove?.("story-active");
      }
    }

    return {
      playWorkflowStory:options=>run("workflow",options),
      playLeadOperationsStory:options=>run("operations",options),
      playReliabilityStory:(scenario,options={})=>run("reliability",{...options,scenario}),
      playArchitectureStory:options=>run("architecture",options),
      cancelAll,
      get reducedMotion(){return prefersReducedMotion()}
    };
  }

  window.LeadFlowStorytelling={createController,buildOperationsStoryContext};
})();
