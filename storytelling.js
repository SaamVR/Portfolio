(()=>{
  const STORY_NAMES=["workflow","operations","reliability","architecture"];

  function prefersReducedMotion(){
    try{return !!matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return false}
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

    const directors={
      workflow:workflowDirector,
      operations:genericDirector,
      reliability:genericDirector,
      architecture:genericDirector
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

  window.LeadFlowStorytelling={createController};
})();
