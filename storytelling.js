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

    const directors={
      workflow:genericDirector,
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
